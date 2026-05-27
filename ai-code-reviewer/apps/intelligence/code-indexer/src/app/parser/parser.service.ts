import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Parser from 'web-tree-sitter';
import * as path from 'path';
import { getLanguageConfig, getSupportedExtensions, LanguageConfig } from './languages.config';

export interface ParsedNode {
  id: string;
  type: 'FUNCTION' | 'CLASS' | 'MODULE' | 'FILE';
  name: string;
  content: string;
  start_line: number;
  end_line: number;
}

export interface ParsedEdge {
  source: string;
  target: string;
  relationship: 'CALLS' | 'IMPORTS' | 'EXTENDS' | 'IMPLEMENTS';
}

export interface ParseResult {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

@Injectable()
export class ParserService implements OnModuleInit {
  private readonly logger = new Logger(ParserService.name);
  private isInitialized = false;

  /** Cache of loaded tree-sitter Language instances, keyed by file extension */
  private readonly languageCache = new Map<string, Parser.Language>();

  async onModuleInit() {
    try {
      await (Parser as any).init();
      this.isInitialized = true;
      this.logger.log(
        `web-tree-sitter initialized successfully. Supported extensions: ${getSupportedExtensions().join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Failed to initialize web-tree-sitter: ${(error as Error).message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Language loading
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resolves the absolute path to a WASM file inside the `tree-sitter-wasms` package.
   */
  private resolveWasmPath(wasmFile: string): string {
    return path.join(
      require.resolve('tree-sitter-wasms/package.json'),
      '..',
      'out',
      wasmFile,
    );
  }

  /**
   * Loads (and caches) the tree-sitter Language for a given file extension.
   * Returns `null` if the extension is unsupported or loading fails.
   */
  private async loadLanguage(extension: string): Promise<Parser.Language | null> {
    if (this.languageCache.has(extension)) {
      return this.languageCache.get(extension)!;
    }

    const config = getLanguageConfig(extension);
    if (!config) {
      return null;
    }

    try {
      const wasmPath = this.resolveWasmPath(config.wasmFile);
      const language = await Parser.Language.load(wasmPath);
      this.languageCache.set(extension, language);
      this.logger.debug(`Loaded ${config.name} grammar from ${config.wasmFile}`);
      return language;
    } catch (error) {
      this.logger.error(
        `Failed to load WASM grammar for ${config.name} (${config.wasmFile}): ${(error as Error).message}`,
      );
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generic Name & Target Extraction Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generic name extractor with fallbacks.
   */
  private extractEntityName(node: Parser.SyntaxNode, config: LanguageConfig): string | null {
    if (config.extractName) {
      const name = config.extractName(node);
      if (name) return name;
    }

    // Standard tree-sitter fields for naming
    const standardNode = node.childForFieldName('name') || node.childForFieldName('declarator');
    if (standardNode) {
      return standardNode.text;
    }

    // Fall back to finding standard identifier types
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i)!;
      if (['identifier', 'type_identifier', 'property_identifier'].includes(child.type)) {
        return child.text;
      }
    }

    // JS/TS Arrow function variable assignment fallback (e.g. const myFunc = () => {})
    if (node.type === 'arrow_function' && node.parent?.type === 'variable_declarator') {
      const nameNode = node.parent.childForFieldName('name') || node.parent.firstChild;
      if (nameNode) return nameNode.text;
    }

    return null;
  }

  /**
   * Generic callee name extractor for call expressions.
   */
  private extractCalleeName(node: Parser.SyntaxNode, config: LanguageConfig): string | null {
    if (config.extractCallee) {
      const callee = config.extractCallee(node);
      if (callee) return callee;
    }

    const fnChild = node.childForFieldName('function');
    if (fnChild) return fnChild.text;

    // Fallback to first child or named child for simple invocations
    return node.firstNamedChild?.text || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Parses a source file and extracts semantic nodes (functions, classes) and
   * edges (calls, imports, inheritance).
   */
  async parseFile(filePath: string, sourceCode: string): Promise<ParseResult> {
    if (!this.isInitialized) {
      throw new Error('Parser not initialized. Ensure onModuleInit completed successfully.');
    }

    const ext = path.extname(filePath).toLowerCase();
    const config = getLanguageConfig(ext);

    if (!config) {
      this.logger.warn(`Unsupported file extension "${ext}" for file: ${filePath}. Skipping AST extraction.`);
      return { nodes: [], edges: [] };
    }

    const language = await this.loadLanguage(ext);
    if (!language) {
      this.logger.error(`Could not load grammar for "${ext}". Skipping file: ${filePath}`);
      return { nodes: [], edges: [] };
    }

    const parser = new Parser();
    parser.setLanguage(language);

    const tree = parser.parse(sourceCode);
    const root = tree.rootNode;

    const nodes: ParsedNode[] = [];
    const edges: ParsedEdge[] = [];
    const scopeStack: string[] = [];

    // Emit the FILE node as the top-level root
    const fileNodeId = filePath;
    nodes.push({
      id: fileNodeId,
      type: 'FILE',
      name: path.basename(filePath),
      content: sourceCode, // Storing full source code per requirements
      start_line: root.startPosition.row + 1,
      end_line: root.endPosition.row + 1,
    });

    const traverse = (node: Parser.SyntaxNode) => {
      if (node.type === 'ERROR') return;

      // 1. Check for IMPORTS
      if (config.importNodeTypes.includes(node.type)) {
        if (config.extractImport) {
          const importTarget = config.extractImport(node);
          if (importTarget) {
            edges.push({
              source: fileNodeId,
              target: importTarget,
              relationship: 'IMPORTS',
            });
          }
        }
        return; // Usually imports do not have nested child structures of interest
      }

      // 2. Check for CLASSES
      if (config.classNodeTypes.includes(node.type)) {
        const name = this.extractEntityName(node, config) || `<anonymous_class_L${node.startPosition.row + 1}>`;
        const classScope = scopeStack.length > 0 ? `${scopeStack.join('.')}.${name}` : name;
        const id = `${filePath}#${classScope}`;

        nodes.push({
          id,
          type: 'CLASS',
          name,
          content: node.text,
          start_line: node.startPosition.row + 1,
          end_line: node.endPosition.row + 1,
        });

        // Extract class inheritance (extends/implements)
        if (config.extractInheritance) {
          const bases = config.extractInheritance(node);
          if (bases) {
            for (const base of bases) {
              edges.push({
                source: id,
                target: base,
                relationship: 'EXTENDS', // Mapping standard extends/implements
              });
            }
          }
        } else {
          // Standard walk fallback for class inheritance nodes
          for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i)!;
            if (config.inheritanceNodeTypes.includes(child.type)) {
              // Extract names from within the inheritance clause
              const baseName = child.text;
              if (baseName) {
                edges.push({
                  source: id,
                  target: baseName,
                  relationship: 'EXTENDS',
                });
              }
            }
          }
        }

        scopeStack.push(name);
        for (let i = 0; i < node.childCount; i++) {
          traverse(node.child(i)!);
        }
        scopeStack.pop();
        return;
      }

      // 3. Check for FUNCTIONS / METHODS
      if (config.functionNodeTypes.includes(node.type)) {
        const name = this.extractEntityName(node, config) || `<anonymous_fn_L${node.startPosition.row + 1}>`;
        const funcScope = scopeStack.length > 0 ? `${scopeStack.join('.')}.${name}` : name;
        const id = `${filePath}#${funcScope}`;

        nodes.push({
          id,
          type: 'FUNCTION',
          name,
          content: node.text,
          start_line: node.startPosition.row + 1,
          end_line: node.endPosition.row + 1,
        });

        scopeStack.push(name);
        for (let i = 0; i < node.childCount; i++) {
          traverse(node.child(i)!);
        }
        scopeStack.pop();
        return;
      }

      // 4. Check for CALLS inside scopes
      if (config.callNodeTypes.includes(node.type)) {
        const callee = this.extractCalleeName(node, config);
        if (callee) {
          const currentCallerScope = scopeStack.length > 0
            ? `${filePath}#${scopeStack.join('.')}`
            : fileNodeId;

          edges.push({
            source: currentCallerScope,
            target: callee,
            relationship: 'CALLS',
          });
        }
        // Do not return; children of calls must be walked (e.g. nested calls: foo(bar()))
      }

      // Recurse children
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i)!);
      }
    };

    // Traverse root tree nodes
    for (let i = 0; i < root.childCount; i++) {
      traverse(root.child(i)!);
    }

    tree.delete();
    return { nodes, edges };
  }
}
