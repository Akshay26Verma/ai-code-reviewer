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

class ScopeTracker {
  private scopes: Map<string, string>[] = [new Map()];

  pushScope() {
    this.scopes.push(new Map());
  }

  popScope() {
    if (this.scopes.length > 1) {
      this.scopes.pop();
    }
  }

  set(varName: string, typeName: string) {
    const current = this.scopes[this.scopes.length - 1];
    current.set(varName, typeName);
  }

  get(varName: string): string | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(varName)) {
        return this.scopes[i].get(varName);
      }
    }
    return undefined;
  }
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

    const importMap = new Map<string, string>();
    const scope = new ScopeTracker();

    // 1. Resolve relative imports relative to the file being parsed.
    //    When the import source has no extension (e.g. `./foo`), we append
    //    the same extension as the file currently being parsed so that the
    //    importMap key matches the node ID the indexer will assign to that
    //    file (e.g. `foo.js` for JS files, `foo.ts` for TS files, etc.).
    const resolveImportPath = (currentFilePath: string, importSource: string): string => {
      if (importSource.startsWith('.')) {
        const dir = path.dirname(currentFilePath);
        let resolved = path.join(dir, importSource);
        resolved = resolved.replace(/\\/g, '/');
        if (!path.extname(resolved)) {
          resolved += ext; // use the current file's extension, not a hardcoded '.ts'
        }
        return resolved;
      }
      return importSource;
    };

    // Helper to parse imports
    const parseImportStatement = (node: Parser.SyntaxNode): { names: string[]; source: string } | null => {
      const sourceNode = node.childForFieldName('source');
      if (!sourceNode) return null;
      const source = sourceNode.text.replace(/['"]/g, '');

      const names: string[] = [];
      const clause = node.childForFieldName('clause') || node.firstNamedChild;
      if (clause) {
        const namedImports = clause.childForFieldName('named_imports') || clause.descendantsOfType('named_imports')[0];
        if (namedImports) {
          namedImports.children.forEach(child => {
            if (child.type === 'import_specifier') {
              const aliasNode = child.childForFieldName('alias');
              const nameNode = child.childForFieldName('name') || child.firstNamedChild;
              const importedName = aliasNode?.text || nameNode?.text;
              if (importedName) names.push(importedName);
            }
          });
        }

        const namespaceImport = clause.descendantsOfType('namespace_import')[0];
        if (namespaceImport) {
          const aliasNode = namespaceImport.childForFieldName('alias') || namespaceImport.firstNamedChild;
          if (aliasNode) names.push(aliasNode.text);
        }

        const firstChild = clause.firstChild;
        if (firstChild && firstChild.type === 'identifier') {
          names.push(firstChild.text);
        }
      }

      if (names.length === 0) {
        node.descendantsOfType('identifier').forEach(id => {
          names.push(id.text);
        });
      }

      return { names, source };
    };

    // First pass to collect imports
    const collectImports = (node: Parser.SyntaxNode) => {
      if (node.type === 'import_statement') {
        const parsed = parseImportStatement(node);
        if (parsed) {
          const resolvedPath = resolveImportPath(filePath, parsed.source);
          parsed.names.forEach(name => {
            importMap.set(name, resolvedPath);
          });
        }
      }
      for (let i = 0; i < node.childCount; i++) {
        collectImports(node.child(i)!);
      }
    };
    collectImports(root);

    // Helpers to register scoped types
    const registerClassFields = (classNode: Parser.SyntaxNode) => {
      const body = classNode.childForFieldName('body') || classNode.descendantsOfType('class_body')[0];
      if (!body) return;

      for (let i = 0; i < body.childCount; i++) {
        const child = body.child(i)!;

        // Class fields
        if (child.type === 'public_field_definition' || child.type === 'property_definition' || child.type === 'field_definition') {
          const nameNode = child.childForFieldName('name') || child.firstNamedChild;
          if (!nameNode) continue;

          const typeNode = child.childForFieldName('type') || child.descendantsOfType('type_annotation')[0];
          if (typeNode) {
            const cleanType = typeNode.text.replace(/^:\s*/, '').trim();
            scope.set(`this.${nameNode.text}`, cleanType);
            scope.set(nameNode.text, cleanType);
            continue;
          }

          const valueNode = child.childForFieldName('value');
          if (valueNode && valueNode.type === 'new_expression') {
            const constructorNode = valueNode.childForFieldName('constructor') || valueNode.firstNamedChild;
            if (constructorNode) {
              scope.set(`this.${nameNode.text}`, constructorNode.text);
              scope.set(nameNode.text, constructorNode.text);
            }
          }
        }

        // Constructor parameters
        if (child.type === 'method_definition') {
          const nameNode = child.childForFieldName('name');
          if (nameNode && nameNode.text === 'constructor') {
            const parametersNode = child.childForFieldName('parameters');
            if (parametersNode) {
              parametersNode.children.forEach(param => {
                // tree-sitter-typescript WASM may emit constructor DI params as:
                //   parameter_property  (newer grammar)      OR
                //   required_parameter with an accessibility_modifier child (older WASM)
                const isParameterProperty = param.type === 'parameter_property';
                const isAccessibleRequired =
                  param.type === 'required_parameter' &&
                  param.children.some(c =>
                    c.type === 'accessibility_modifier' ||
                    ['public', 'private', 'protected'].includes(c.text),
                  );

                if (!isParameterProperty && !isAccessibleRequired) return;

                const typeAnnotations = param.descendantsOfType('type_annotation');
                const identifiers = param.descendantsOfType('identifier')
                  .filter(id => !['public', 'private', 'protected', 'readonly', 'override'].includes(id.text));


                const fieldName = identifiers[0] ?? null;
                const typeAnnotation = typeAnnotations[0] ?? null;

                if (fieldName && typeAnnotation) {
                  const cleanType = typeAnnotation.text.replace(/^:\s*/, '').trim();
                  scope.set(`this.${fieldName.text}`, cleanType);
                  scope.set(fieldName.text, cleanType);
                }
              });

            }
          }
        }
      }
    };

    const registerFunctionParameters = (funcNode: Parser.SyntaxNode) => {
      const parametersNode = funcNode.childForFieldName('parameters');
      if (!parametersNode) return;

      parametersNode.children.forEach(param => {
        let nameNode: Parser.SyntaxNode | null = null;
        let typeNode: Parser.SyntaxNode | null = null;

        if (param.type === 'required_parameter' || param.type === 'parameter') {
          nameNode = param.childForFieldName('name') || param.firstNamedChild;
          typeNode = param.childForFieldName('type') || param.descendantsOfType('type_annotation')[0];
        }

        if (nameNode && typeNode) {
          const cleanType = typeNode.text.replace(/^:\s*/, '').trim();
          scope.set(nameNode.text, cleanType);
        }
      });
    };

    const resolveCalleeTarget = (calleeNode: Parser.SyntaxNode): { typeName: string; methodName: string } | null => {
      if (calleeNode.type === 'member_expression') {
        const objectNode = calleeNode.childForFieldName('object');
        const propertyNode = calleeNode.childForFieldName('property');
        if (objectNode && propertyNode) {
          const objectText = objectNode.text;
          const methodName = propertyNode.text;

          const resolvedType = scope.get(objectText);

          if (resolvedType) {
            return { typeName: resolvedType, methodName };
          }
        }
      }
      return null;
    };

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
        return; // Import nodes have no child structures of interest
      }

      // 1b. Scope-only nodes: push a named scope without emitting a graph node.
      //     Used for Rust impl blocks to avoid duplicate IDs with their struct_item.
      if (config.scopeNodeTypes?.includes(node.type)) {
        const name = config.extractScopeName?.(node) ?? `<scope_L${node.startPosition.row + 1}>`;
        scopeStack.push(name);
        scope.pushScope();
        for (let i = 0; i < node.childCount; i++) {
          traverse(node.child(i)!);
        }
        scopeStack.pop();
        scope.popScope();
        return;
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
                target: base.name,
                relationship: base.relationship,
              });
            }
          }
        } else {
          // Fallback: walk children and emit edges based on extendsNodeTypes / implementsNodeTypes
          for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i)!;
            if (config.extendsNodeTypes.includes(child.type)) {
              edges.push({ source: id, target: child.text, relationship: 'EXTENDS' });
            } else if (config.implementsNodeTypes.includes(child.type)) {
              edges.push({ source: id, target: child.text, relationship: 'IMPLEMENTS' });
            }
          }
        }

        scope.pushScope();
        registerClassFields(node);

        scopeStack.push(name);
        for (let i = 0; i < node.childCount; i++) {
          traverse(node.child(i)!);
        }
        scopeStack.pop();
        scope.popScope();
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

        scope.pushScope();
        registerFunctionParameters(node);

        scopeStack.push(name);
        for (let i = 0; i < node.childCount; i++) {
          traverse(node.child(i)!);
        }
        scopeStack.pop();
        scope.popScope();
        return;
      }

      // 3b. Check for Lexical Variable Declarations within blocks
      if (node.type === 'variable_declarator') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const typeNode = node.childForFieldName('type') || node.descendantsOfType('type_annotation')[0];
          if (typeNode) {
            const cleanType = typeNode.text.replace(/^:\s*/, '').trim();
            scope.set(nameNode.text, cleanType);
          } else {
            const valueNode = node.childForFieldName('value');
            if (valueNode && valueNode.type === 'new_expression') {
              const constructorNode = valueNode.childForFieldName('constructor') || valueNode.firstNamedChild;
              if (constructorNode) {
                scope.set(nameNode.text, constructorNode.text);
              }
            }
          }
        }
      }

      // 4. Check for CALLS inside scopes
      if (config.callNodeTypes.includes(node.type)) {
        const calleeNode = node.childForFieldName('function') || node.firstNamedChild;
        const callee = this.extractCalleeName(node, config);
        
        if (calleeNode && callee) {
          const currentCallerScope = scopeStack.length > 0
            ? `${filePath}#${scopeStack.join('.')}`
            : fileNodeId;

          const resolved = resolveCalleeTarget(calleeNode);
          if (resolved) {
            const importPath = importMap.get(resolved.typeName);
            const targetFile = importPath || fileNodeId;
            const calleeId = `${targetFile}#${resolved.typeName}.${resolved.methodName}`;

            edges.push({
              source: currentCallerScope,
              target: calleeId,
              relationship: 'CALLS',
            });
          } else {
            edges.push({
              source: currentCallerScope,
              target: callee,
              relationship: 'CALLS',
            });
          }
        }
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
