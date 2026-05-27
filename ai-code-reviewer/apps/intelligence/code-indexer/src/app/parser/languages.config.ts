import Parser from 'web-tree-sitter';

/**
 * Language configuration for the AST parser.
 *
 * Each entry maps a file extension to the corresponding tree-sitter WASM
 * grammar file and the AST node types used to identify functions, classes,
 * import statements, call expressions, and inheritance relationships.
 */
export interface LanguageConfig {
  /** Display name for logging */
  name: string;

  /** WASM filename inside `tree-sitter-wasms/out/` */
  wasmFile: string;

  // ── Entity extraction node types ──────────────────────────────────────

  /** AST node types that represent class/struct/interface definitions */
  classNodeTypes: string[];

  /** AST node types that represent function/method definitions */
  functionNodeTypes: string[];

  // ── Relationship extraction node types ────────────────────────────────

  /** AST node types that represent function/method calls */
  callNodeTypes: string[];

  /** AST node types that represent import/require statements */
  importNodeTypes: string[];

  /** AST node types that represent class inheritance (extends/implements) */
  inheritanceNodeTypes: string[];

  // ── Optional Language-Specific Overrides ─────────────────────────────────

  /** Override to extract entity (class/function) name */
  extractName?: (node: Parser.SyntaxNode) => string | null;

  /** Override to extract import target paths */
  extractImport?: (node: Parser.SyntaxNode) => string | null;

  /** Override to extract base classes or interfaces for inheritance edges */
  extractInheritance?: (node: Parser.SyntaxNode) => string[] | null;

  /** Override to extract the callee (function name) of a call expression */
  extractCallee?: (node: Parser.SyntaxNode) => string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supported languages
// ─────────────────────────────────────────────────────────────────────────────

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  // ── TypeScript ──────────────────────────────────────────────────────────
  '.ts': {
    name: 'TypeScript',
    wasmFile: 'tree-sitter-typescript.wasm',
    classNodeTypes: ['class_declaration', 'abstract_class_declaration', 'interface_declaration'],
    functionNodeTypes: [
      'function_declaration',
      'method_definition',
      'arrow_function',
      'generator_function_declaration',
    ],
    callNodeTypes: ['call_expression', 'new_expression'],
    importNodeTypes: ['import_statement'],
    inheritanceNodeTypes: ['extends_clause', 'implements_clause'],
    extractImport: (node) => {
      // import { X } from 'source'
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
  },

  // ── TSX ─────────────────────────────────────────────────────────────────
  '.tsx': {
    name: 'TSX',
    wasmFile: 'tree-sitter-tsx.wasm',
    classNodeTypes: ['class_declaration', 'abstract_class_declaration', 'interface_declaration'],
    functionNodeTypes: [
      'function_declaration',
      'method_definition',
      'arrow_function',
      'generator_function_declaration',
    ],
    callNodeTypes: ['call_expression', 'new_expression'],
    importNodeTypes: ['import_statement'],
    inheritanceNodeTypes: ['extends_clause', 'implements_clause'],
    extractImport: (node) => {
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
  },

  // ── JavaScript ──────────────────────────────────────────────────────────
  '.js': {
    name: 'JavaScript',
    wasmFile: 'tree-sitter-javascript.wasm',
    classNodeTypes: ['class_declaration'],
    functionNodeTypes: [
      'function_declaration',
      'method_definition',
      'arrow_function',
      'generator_function_declaration',
    ],
    callNodeTypes: ['call_expression', 'new_expression'],
    importNodeTypes: ['import_statement'],
    inheritanceNodeTypes: ['extends_clause'],
    extractImport: (node) => {
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
  },

  // ── JSX ─────────────────────────────────────────────────────────────────
  '.jsx': {
    name: 'JSX',
    wasmFile: 'tree-sitter-javascript.wasm',
    classNodeTypes: ['class_declaration'],
    functionNodeTypes: [
      'function_declaration',
      'method_definition',
      'arrow_function',
      'generator_function_declaration',
    ],
    callNodeTypes: ['call_expression', 'new_expression'],
    importNodeTypes: ['import_statement'],
    inheritanceNodeTypes: ['extends_clause'],
    extractImport: (node) => {
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
  },

  // ── Python ──────────────────────────────────────────────────────────────
  '.py': {
    name: 'Python',
    wasmFile: 'tree-sitter-python.wasm',
    classNodeTypes: ['class_definition'],
    functionNodeTypes: ['function_definition'],
    callNodeTypes: ['call'],
    importNodeTypes: ['import_statement', 'import_from_statement'],
    inheritanceNodeTypes: ['argument_list'],
    extractImport: (node) => {
      if (node.type === 'import_from_statement') {
        // from path.to.module import name -> "path.to.module"
        return node.childForFieldName('module')?.text || null;
      }
      // import os -> "os"
      return node.child(1)?.text || null;
    },
    extractInheritance: (node) => {
      // In python, class declarations list base classes inside their arguments:
      // class Foo(Base1, Base2):
      const argList = node.childForFieldName('superclasses');
      if (!argList) return null;
      return argList.children
        .filter((c) => c.type === 'identifier' || c.type === 'attribute')
        .map((c) => c.text);
    },
  },

  // ── Java ────────────────────────────────────────────────────────────────
  '.java': {
    name: 'Java',
    wasmFile: 'tree-sitter-java.wasm',
    classNodeTypes: ['class_declaration', 'interface_declaration', 'enum_declaration'],
    functionNodeTypes: ['method_declaration', 'constructor_declaration'],
    callNodeTypes: ['method_invocation', 'object_creation_expression'],
    importNodeTypes: ['import_declaration'],
    inheritanceNodeTypes: ['superclass', 'super_interfaces'],
    extractImport: (node) => {
      // import java.util.List; -> "java.util.List"
      return node.child(1)?.text || null;
    },
    extractInheritance: (node) => {
      const bases: string[] = [];
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i)!;
        if (child.type === 'superclass') {
          // "extends BaseController" -> "BaseController"
          const name = child.child(1)?.text;
          if (name) bases.push(name);
        } else if (child.type === 'super_interfaces') {
          // "implements I1, I2" -> extract interface names
          const typeList = child.child(1);
          if (typeList) {
            bases.push(...typeList.text.split(',').map((s) => s.trim()));
          }
        }
      }
      return bases.length > 0 ? bases : null;
    },
    extractCallee: (node) => {
      // For method_invocation (e.g. service.findById(id)), get the "name" identifier child
      // and optional "object" receiver.
      const name = node.childForFieldName('name')?.text;
      const object = node.childForFieldName('object')?.text;
      if (object && name) {
        return `${object}.${name}`;
      }
      return name || null;
    },
  },

  // ── Go ──────────────────────────────────────────────────────────────────
  '.go': {
    name: 'Go',
    wasmFile: 'tree-sitter-go.wasm',
    classNodeTypes: ['type_spec'],
    functionNodeTypes: ['function_declaration', 'method_declaration'],
    callNodeTypes: ['call_expression'],
    importNodeTypes: ['import_declaration'],
    inheritanceNodeTypes: [],
    extractImport: (node) => {
      // import "fmt" -> "fmt"
      return node.childForFieldName('path')?.text?.replace(/['"]/g, '') || null;
    },
  },

  // ── Rust ────────────────────────────────────────────────────────────────
  '.rs': {
    name: 'Rust',
    wasmFile: 'tree-sitter-rust.wasm',
    classNodeTypes: ['struct_item', 'enum_item', 'trait_item', 'impl_item'],
    functionNodeTypes: ['function_item'],
    callNodeTypes: ['call_expression'],
    importNodeTypes: ['use_declaration'],
    inheritanceNodeTypes: [],
    extractImport: (node) => {
      // use std::collections::HashMap; -> "std::collections::HashMap"
      return node.child(1)?.text || null;
    },
  },

  // ── C# ──────────────────────────────────────────────────────────────────
  '.cs': {
    name: 'C#',
    wasmFile: 'tree-sitter-c_sharp.wasm',
    classNodeTypes: ['class_declaration', 'interface_declaration', 'struct_declaration', 'enum_declaration'],
    functionNodeTypes: ['method_declaration', 'constructor_declaration'],
    callNodeTypes: ['invocation_expression', 'object_creation_expression'],
    importNodeTypes: ['using_directive'],
    inheritanceNodeTypes: ['base_list'],
    extractImport: (node) => {
      // using System; -> "System"
      return node.child(1)?.text || null;
    },
    extractInheritance: (node) => {
      // base_list contains children starting with ":"
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i)!;
        if (child.type === 'base_list') {
          // ": IService, IBase"
          const clean = child.text.replace(/^:\s*/, '');
          return clean.split(',').map((s) => s.trim());
        }
      }
      return null;
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the `LanguageConfig` for a given file extension, or `null` if unsupported.
 */
export function getLanguageConfig(extension: string): LanguageConfig | null {
  return LANGUAGE_CONFIGS[extension.toLowerCase()] ?? null;
}

/**
 * Returns a sorted list of all supported file extensions.
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(LANGUAGE_CONFIGS).sort();
}
