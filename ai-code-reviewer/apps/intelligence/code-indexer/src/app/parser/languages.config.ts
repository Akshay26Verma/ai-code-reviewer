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

  /** AST node types that represent class extension (extends keyword) */
  extendsNodeTypes: string[];

  /** AST node types that represent interface implementation (implements keyword) */
  implementsNodeTypes: string[];

  // ── Optional Language-Specific Overrides ─────────────────────────────────

  /** Override to extract entity (class/function) name */
  extractName?: (node: Parser.SyntaxNode) => string | null;

  /** Override to extract import target paths */
  extractImport?: (node: Parser.SyntaxNode) => string | null;

  /**
   * Override to extract base classes and interfaces for inheritance edges.
   * Each entry carries the resolved relationship so EXTENDS and IMPLEMENTS
   * can be emitted correctly. Falls back to extendsNodeTypes/implementsNodeTypes
   * when not defined.
   */
  extractInheritance?: (node: Parser.SyntaxNode) => { name: string; relationship: 'EXTENDS' | 'IMPLEMENTS' }[] | null;

  /** Override to extract the callee (function name) of a call expression */
  extractCallee?: (node: Parser.SyntaxNode) => string | null;

  /**
   * Node types that push a named scope onto the stack without emitting a graph
   * node themselves. Used for Rust impl blocks, which share their name with the
   * struct they implement and would otherwise create duplicate node IDs.
   */
  scopeNodeTypes?: string[];

  /** Extracts the scope name for a scopeNodeTypes node (e.g. the struct name from an impl block). */
  extractScopeName?: (node: Parser.SyntaxNode) => string | null;
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
    extendsNodeTypes: ['extends_clause'],
    implementsNodeTypes: ['implements_clause'],
    extractImport: (node) => {
      // import { X } from 'source'
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
    extractInheritance: (node) => {
      // extends_clause / implements_clause may be wrapped in a class_heritage
      // intermediate node — use descendantsOfType to find them at any depth.
      const results: { name: string; relationship: 'EXTENDS' | 'IMPLEMENTS' }[] = [];
      node.descendantsOfType('extends_clause').forEach(clause => {
        clause.children.forEach(child => {
          if (child.type === 'extends') return;
          // expression_with_type_arguments wraps generic base types like React.Component<Props>
          const name = (child.childForFieldName('expression')?.text ?? child.text).split('<')[0].trim();
          if (name) results.push({ name, relationship: 'EXTENDS' });
        });
      });
      node.descendantsOfType('implements_clause').forEach(clause => {
        clause.children.forEach(child => {
          if (child.type === 'implements' || child.type === ',') return;
          // generic_type wraps types like IRepository<User> — take just the name
          const name = (child.childForFieldName('name')?.text ?? child.text).split('<')[0].trim();
          if (name) results.push({ name, relationship: 'IMPLEMENTS' });
        });
      });
      return results.length > 0 ? results : null;
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
    extendsNodeTypes: ['extends_clause'],
    implementsNodeTypes: ['implements_clause'],
    extractImport: (node) => {
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
    extractInheritance: (node) => {
      const results: { name: string; relationship: 'EXTENDS' | 'IMPLEMENTS' }[] = [];
      node.descendantsOfType('extends_clause').forEach(clause => {
        clause.children.forEach(child => {
          if (child.type === 'extends') return;
          const name = (child.childForFieldName('expression')?.text ?? child.text).split('<')[0].trim();
          if (name) results.push({ name, relationship: 'EXTENDS' });
        });
      });
      node.descendantsOfType('implements_clause').forEach(clause => {
        clause.children.forEach(child => {
          if (child.type === 'implements' || child.type === ',') return;
          const name = (child.childForFieldName('name')?.text ?? child.text).split('<')[0].trim();
          if (name) results.push({ name, relationship: 'IMPLEMENTS' });
        });
      });
      return results.length > 0 ? results : null;
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
    extendsNodeTypes: ['extends_clause'],
    implementsNodeTypes: [],
    extractImport: (node) => {
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
    extractInheritance: (node) => {
      // tree-sitter-javascript uses extends_clause in some grammar versions and
      // class_heritage in others. Try extends_clause first; fall back to class_heritage.
      const results: { name: string; relationship: 'EXTENDS' | 'IMPLEMENTS' }[] = [];
      const extendsClauses = node.descendantsOfType('extends_clause');
      if (extendsClauses.length > 0) {
        extendsClauses.forEach(clause => {
          clause.children.forEach(child => {
            if (child.type === 'extends') return;
            results.push({ name: child.text.split('<')[0].trim(), relationship: 'EXTENDS' });
          });
        });
      } else {
        node.descendantsOfType('class_heritage').forEach(clause => {
          // class_heritage: "extends" <expression> — skip the keyword at index 0
          for (let i = 1; i < clause.childCount; i++) {
            const child = clause.child(i)!;
            if (child.type !== ',') {
              results.push({ name: child.text.split('<')[0].trim(), relationship: 'EXTENDS' });
            }
          }
        });
      }
      return results.length > 0 ? results : null;
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
    extendsNodeTypes: ['extends_clause'],
    implementsNodeTypes: [],
    extractImport: (node) => {
      return node.childForFieldName('source')?.text?.replace(/['"]/g, '') || null;
    },
    extractInheritance: (node) => {
      const results: { name: string; relationship: 'EXTENDS' | 'IMPLEMENTS' }[] = [];
      const extendsClauses = node.descendantsOfType('extends_clause');
      if (extendsClauses.length > 0) {
        extendsClauses.forEach(clause => {
          clause.children.forEach(child => {
            if (child.type === 'extends') return;
            results.push({ name: child.text.split('<')[0].trim(), relationship: 'EXTENDS' });
          });
        });
      } else {
        node.descendantsOfType('class_heritage').forEach(clause => {
          for (let i = 1; i < clause.childCount; i++) {
            const child = clause.child(i)!;
            if (child.type !== ',') {
              results.push({ name: child.text.split('<')[0].trim(), relationship: 'EXTENDS' });
            }
          }
        });
      }
      return results.length > 0 ? results : null;
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
    // Python has no implements keyword — all base classes are EXTENDS
    extendsNodeTypes: [],
    implementsNodeTypes: [],
    extractImport: (node) => {
      if (node.type === 'import_from_statement') {
        // tree-sitter-python names this field 'module_name'; fall back to positional child(1)
        return node.childForFieldName('module_name')?.text
          || node.childForFieldName('module')?.text
          || node.child(1)?.text
          || null;
      }
      // import os -> "os"
      return node.child(1)?.text || null;
    },
    extractInheritance: (node) => {
      // class Foo(Base1, Base2): — all bases are EXTENDS in Python
      const argList = node.childForFieldName('superclasses');
      if (!argList) return null;
      return argList.children
        .filter((c) => c.type === 'identifier' || c.type === 'attribute')
        .map((c) => ({ name: c.text, relationship: 'EXTENDS' as const }));
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
    // Java distinguishes extends/implements at AST level via superclass vs super_interfaces nodes
    extendsNodeTypes: [],
    implementsNodeTypes: [],
    extractImport: (node) => {
      // import java.util.List; -> "java.util.List"
      return node.child(1)?.text || null;
    },
    extractInheritance: (node) => {
      const bases: { name: string; relationship: 'EXTENDS' | 'IMPLEMENTS' }[] = [];
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i)!;
        if (child.type === 'superclass') {
          // "extends BaseController" -> EXTENDS BaseController
          const name = child.child(1)?.text;
          if (name) bases.push({ name, relationship: 'EXTENDS' });
        } else if (child.type === 'super_interfaces') {
          // "implements I1, I2" -> IMPLEMENTS I1, IMPLEMENTS I2
          const typeList = child.child(1);
          if (typeList) {
            typeList.text.split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((name) => bases.push({ name, relationship: 'IMPLEMENTS' }));
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
    // import_spec covers both single (`import "fmt"`) and grouped (`import ( "fmt" )`) forms
    importNodeTypes: ['import_spec'],
    // Go uses structural typing — no explicit extends/implements keywords
    extendsNodeTypes: [],
    implementsNodeTypes: [],
    extractImport: (node) => {
      // import_spec always has a path field
      return node.childForFieldName('path')?.text?.replace(/['"]/g, '') || null;
    },
  },

  // ── Rust ────────────────────────────────────────────────────────────────
  '.rs': {
    name: 'Rust',
    wasmFile: 'tree-sitter-rust.wasm',
    // impl_item is intentionally excluded here — it is handled as a scope
    // container via scopeNodeTypes to avoid duplicate node IDs with struct_item
    classNodeTypes: ['struct_item', 'enum_item', 'trait_item'],
    functionNodeTypes: ['function_item'],
    callNodeTypes: ['call_expression'],
    importNodeTypes: ['use_declaration'],
    // Rust has no class inheritance
    extendsNodeTypes: [],
    implementsNodeTypes: [],
    extractImport: (node) => {
      // use std::collections::HashMap; -> "std::collections::HashMap"
      return node.child(1)?.text || null;
    },
    scopeNodeTypes: ['impl_item'],
    extractScopeName: (node) => {
      // impl Cache { ... }            -> scope "Cache"
      // impl Trait for Cache { ... }  -> scope "Cache" (the concrete type)
      const forIdx = node.children.findIndex((c) => c.type === 'for');
      if (forIdx >= 0) {
        // Type after the `for` keyword is the concrete implementing type
        return node.children[forIdx + 1]?.text ?? null;
      }
      // No `for` — first type identifier after the `impl` keyword
      return node.childForFieldName('name')?.text
        ?? node.descendantsOfType('type_identifier')[0]?.text
        ?? null;
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
    // base_list is handled by extractInheritance; these fallback arrays are unused for C#
    extendsNodeTypes: [],
    implementsNodeTypes: [],
    extractImport: (node) => {
      // using System; -> "System"
      return node.child(1)?.text || null;
    },
    extractInheritance: (node) => {
      // C# syntax `: BaseClass, IInterface` does not distinguish base class from interfaces
      // at the AST level without type information. All entries are emitted as EXTENDS.
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i)!;
        if (child.type === 'base_list') {
          const clean = child.text.replace(/^:\s*/, '');
          return clean.split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name, relationship: 'EXTENDS' as const }));
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
