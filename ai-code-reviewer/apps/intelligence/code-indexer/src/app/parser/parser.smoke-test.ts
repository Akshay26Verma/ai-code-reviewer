/**
 * Smoke test for ParserService AST walking and normalization logic.
 *
 * Run with:  npx ts-node --project apps/intelligence/code-indexer/tsconfig.app.json apps/intelligence/code-indexer/src/app/parser/parser.smoke-test.ts
 */

import { ParserService, ParseResult } from './parser.service';

// ─────────────────────────────────────────────────────────────────────────────
// Assertion helpers
// ─────────────────────────────────────────────────────────────────────────────

function assertNode(
  result: ParseResult,
  predicate: (n: typeof result.nodes[0]) => boolean,
  description: string,
) {
  if (!result.nodes.some(predicate)) {
    throw new Error(`Node assertion failed: ${description}`);
  }
}

function assertEdge(
  result: ParseResult,
  predicate: (e: typeof result.edges[0]) => boolean,
  description: string,
) {
  if (!result.edges.some(predicate)) {
    throw new Error(`Edge assertion failed: ${description}`);
  }
}

function assertNoEdge(
  result: ParseResult,
  predicate: (e: typeof result.edges[0]) => boolean,
  description: string,
) {
  if (result.edges.some(predicate)) {
    throw new Error(`Unexpected edge found: ${description}`);
  }
}

function assertNodeCount(
  result: ParseResult,
  predicate: (n: typeof result.nodes[0]) => boolean,
  expected: number,
  description: string,
) {
  const actual = result.nodes.filter(predicate).length;
  if (actual !== expected) {
    throw new Error(`Node count assertion failed: ${description} — expected ${expected}, got ${actual}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test cases
// ─────────────────────────────────────────────────────────────────────────────

interface TestCase {
  filePath: string;
  code: string;
  assert: (result: ParseResult) => void;
}

const TEST_CASES: Record<string, TestCase> = {

  // ── TypeScript ──────────────────────────────────────────────────────────
  '.ts': {
    filePath: 'example.ts',
    code: `
import { Injectable } from '@nestjs/common';
import { Logger } from './logger';
import { CacheService } from './cache';

export class UserService extends BaseService implements IUserService {
  private users: string[] = [];

  constructor(private cache: CacheService, private logger: Logger) {}

  async getUser(id: number): Promise<string> {
    this.logger.log('getting user');
    return this.users[id];
  }

  addUser(name: string): void {
    const defaultCache = new CacheService();
    defaultCache.set(name, 'value');
    this.cache.set(name, 'injected');
    this.users.push(name);
  }
}
`,
    assert(result) {
      // Node structure
      assertNode(result, n => n.type === 'FILE' && n.id === 'example.ts', 'FILE node with correct id');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'UserService' && n.id === 'example.ts#UserService', 'CLASS UserService with scoped id');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'example.ts#UserService.getUser', 'FUNCTION UserService.getUser');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'example.ts#UserService.addUser', 'FUNCTION UserService.addUser');

      // Import edges (raw paths from extractImport, no extension processing)
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === '@nestjs/common', 'IMPORTS @nestjs/common');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === './logger', 'IMPORTS ./logger');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === './cache', 'IMPORTS ./cache');

      // Inheritance edges — TS AST distinguishes extends vs implements
      assertEdge(result, e => e.relationship === 'EXTENDS' && e.source === 'example.ts#UserService', 'EXTENDS edge from UserService');
      assertEdge(result, e => e.relationship === 'IMPLEMENTS' && e.source === 'example.ts#UserService', 'IMPLEMENTS edge from UserService');

      // Typed call resolution via constructor DI scope tracking
      assertEdge(result, e => e.relationship === 'CALLS' && e.target === 'logger.ts#Logger.log', 'CALLS Logger.log resolved via DI type');
      assertEdge(result, e => e.relationship === 'CALLS' && e.target === 'cache.ts#CacheService.set', 'CALLS CacheService.set resolved via DI type');
    },
  },

  // ── TSX ─────────────────────────────────────────────────────────────────
  '.tsx': {
    filePath: 'UserCard.tsx',
    code: `
import React from 'react';
import { Logger } from './logger';

interface Props {
  name: string;
}

export class UserCard extends React.Component<Props> {
  private logger: Logger;

  constructor(props: Props) {
    super(props);
    this.logger = new Logger();
  }

  render() {
    this.logger.log('rendering');
    return React.createElement('div', null, this.props.name);
  }
}

export const formatName = (name: string): string => {
  return name.trim().toLowerCase();
};
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE' && n.id === 'UserCard.tsx', 'FILE node');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'UserCard', 'CLASS UserCard');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'UserCard.tsx#UserCard.render', 'FUNCTION UserCard.render');
      assertNode(result, n => n.type === 'FUNCTION' && n.name === 'formatName', 'FUNCTION formatName (arrow function)');

      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'react', 'IMPORTS react');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === './logger', 'IMPORTS ./logger');

      // TSX class inheritance
      assertEdge(result, e => e.relationship === 'EXTENDS' && e.source === 'UserCard.tsx#UserCard', 'EXTENDS edge from UserCard');

      // Typed call via new_expression assignment: this.logger = new Logger()
      assertEdge(result, e => e.relationship === 'CALLS' && e.target === 'logger.tsx#Logger.log', 'CALLS Logger.log resolved via new_expression assignment');
    },
  },

  // ── JavaScript ──────────────────────────────────────────────────────────
  '.js': {
    filePath: 'task-queue.js',
    code: `
import EventEmitter from 'events';
import { Logger } from './logger';

class TaskQueue extends EventEmitter {
  tasks = [];
  logger = new Logger();

  enqueue(task) {
    this.tasks.push(task);
    this.logger.log(task);
    this.emit('task:added', task);
  }
}

function processQueue(queue) {
  queue.enqueue({ id: 1 });
}
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE', 'FILE node');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'TaskQueue', 'CLASS TaskQueue');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'task-queue.js#TaskQueue.enqueue', 'FUNCTION TaskQueue.enqueue');
      assertNode(result, n => n.type === 'FUNCTION' && n.name === 'processQueue', 'FUNCTION processQueue');

      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'events', 'IMPORTS events');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === './logger', 'IMPORTS ./logger');

      // JS has extends but no implements keyword
      assertEdge(result, e => e.relationship === 'EXTENDS' && e.source === 'task-queue.js#TaskQueue', 'EXTENDS EventEmitter');
      assertNoEdge(result, e => e.relationship === 'IMPLEMENTS', 'No IMPLEMENTS edges in JS (no implements keyword)');

      // class field `logger = new Logger()` → registerClassFields sets this.logger → Logger
      // → Logger.log call resolves to the imported file
      assertEdge(result, e => e.relationship === 'CALLS' && e.target === 'logger.js#Logger.log', 'CALLS Logger.log resolved via class field new_expression');
    },
  },

  // ── JSX ─────────────────────────────────────────────────────────────────
  '.jsx': {
    filePath: 'Button.jsx',
    code: `
import React from 'react';

class Button extends React.Component {
  handleClick() {
    console.log('clicked');
  }

  render() {
    return React.createElement('button', { onClick: this.handleClick });
  }
}

export default Button;
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE', 'FILE node');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'Button', 'CLASS Button');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'Button.jsx#Button.render', 'FUNCTION Button.render');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'Button.jsx#Button.handleClick', 'FUNCTION Button.handleClick');

      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'react', 'IMPORTS react');
      assertEdge(result, e => e.relationship === 'EXTENDS' && e.source === 'Button.jsx#Button', 'EXTENDS React.Component');
    },
  },

  // ── Python ──────────────────────────────────────────────────────────────
  '.py': {
    filePath: 'processor.py',
    code: `
import os
from pathlib import Path

class FileProcessor(BaseProcessor):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)

    def process(self, filename: str) -> str:
        full_path = self.base_dir / filename
        return os.path.basename(str(full_path))

class ArchiveProcessor(FileProcessor):
    def process(self, filename: str) -> str:
        return super().process(filename) + '.gz'
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE', 'FILE node');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'FileProcessor', 'CLASS FileProcessor');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'ArchiveProcessor', 'CLASS ArchiveProcessor');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'processor.py#FileProcessor.process', 'FUNCTION FileProcessor.process');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'processor.py#ArchiveProcessor.process', 'FUNCTION ArchiveProcessor.process');

      // Both import styles
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'os', 'IMPORTS os');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'pathlib', 'IMPORTS pathlib (from...import)');

      // Python has no implements — all base classes emit EXTENDS
      assertEdge(result, e => e.relationship === 'EXTENDS' && e.source === 'processor.py#FileProcessor', 'EXTENDS BaseProcessor');
      assertEdge(result, e => e.relationship === 'EXTENDS' && e.source === 'processor.py#ArchiveProcessor', 'EXTENDS FileProcessor');
      assertNoEdge(result, e => e.relationship === 'IMPLEMENTS', 'No IMPLEMENTS edges in Python');
    },
  },

  // ── Java ────────────────────────────────────────────────────────────────
  '.java': {
    filePath: 'UserController.java',
    code: `
import java.util.List;
import java.util.Optional;

public class UserController extends BaseController implements RequestHandler, Serializable {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    public String getUser(int id) {
        return service.findById(id);
    }

    public List<String> listUsers() {
        return service.findAll();
    }
}
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE', 'FILE node');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'UserController', 'CLASS UserController');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'UserController.java#UserController.getUser', 'FUNCTION UserController.getUser');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'UserController.java#UserController.listUsers', 'FUNCTION UserController.listUsers');

      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'java.util.List', 'IMPORTS java.util.List');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'java.util.Optional', 'IMPORTS java.util.Optional');

      // Java AST distinguishes extends (superclass) vs implements (super_interfaces)
      assertEdge(result, e => e.relationship === 'EXTENDS' && e.source.includes('UserController') && e.target === 'BaseController', 'EXTENDS BaseController');
      assertEdge(result, e => e.relationship === 'IMPLEMENTS' && e.source.includes('UserController') && e.target === 'RequestHandler', 'IMPLEMENTS RequestHandler');
      assertEdge(result, e => e.relationship === 'IMPLEMENTS' && e.source.includes('UserController') && e.target === 'Serializable', 'IMPLEMENTS Serializable');
    },
  },

  // ── Go ──────────────────────────────────────────────────────────────────
  '.go': {
    filePath: 'server.go',
    code: `
package main

import (
	"fmt"
	"os"
)

type Server struct {
	Port int
	Host string
}

func (s *Server) Start() {
	fmt.Printf("Starting on %s:%d\\n", s.Host, s.Port)
}

func (s *Server) Stop() {
	os.Exit(0)
}

func main() {
	s := Server{Port: 8080, Host: "localhost"}
	s.Start()
}
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE', 'FILE node');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'Server', 'CLASS Server (struct type_spec)');
      assertNode(result, n => n.type === 'FUNCTION' && n.name === 'Start', 'FUNCTION Start');
      assertNode(result, n => n.type === 'FUNCTION' && n.name === 'Stop', 'FUNCTION Stop');
      assertNode(result, n => n.type === 'FUNCTION' && n.name === 'main', 'FUNCTION main');

      // Grouped import block — both specifiers must produce IMPORTS edges
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'fmt', 'IMPORTS fmt (grouped import)');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'os', 'IMPORTS os (grouped import)');

      // Go uses structural typing — no EXTENDS or IMPLEMENTS
      assertNoEdge(result, e => e.relationship === 'EXTENDS', 'No EXTENDS edges in Go');
      assertNoEdge(result, e => e.relationship === 'IMPLEMENTS', 'No IMPLEMENTS edges in Go');
    },
  },

  // ── Rust ────────────────────────────────────────────────────────────────
  '.rs': {
    filePath: 'cache.rs',
    code: `
use std::collections::HashMap;

struct Cache {
    data: HashMap<String, String>,
}

impl Cache {
    fn new() -> Self {
        Cache { data: HashMap::new() }
    }

    fn get(&self, key: &str) -> Option<&String> {
        self.data.get(key)
    }
}

trait Serializable {
    fn serialize(&self) -> String;
}

impl Serializable for Cache {
    fn serialize(&self) -> String {
        String::from("cache")
    }
}
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE', 'FILE node');

      // impl_item fix: only ONE CLASS node for Cache, not two
      assertNodeCount(result, n => n.type === 'CLASS' && n.name === 'Cache', 1, 'exactly 1 CLASS node named Cache (impl_item must not duplicate struct_item)');

      // Trait is also a class
      assertNode(result, n => n.type === 'CLASS' && n.name === 'Serializable', 'CLASS Serializable (trait)');

      // Functions inside `impl Cache` must be scoped under Cache
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'cache.rs#Cache.new', 'FUNCTION Cache.new (scoped via impl_item)');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'cache.rs#Cache.get', 'FUNCTION Cache.get (scoped via impl_item)');

      // Functions inside `impl Serializable for Cache` must scope to the concrete type Cache
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'cache.rs#Cache.serialize', 'FUNCTION Cache.serialize (scoped to concrete type from impl Trait for Struct)');

      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'std::collections::HashMap', 'IMPORTS std::collections::HashMap');

      // Rust has no class inheritance
      assertNoEdge(result, e => e.relationship === 'EXTENDS', 'No EXTENDS edges in Rust');
      assertNoEdge(result, e => e.relationship === 'IMPLEMENTS', 'No IMPLEMENTS edges in Rust');
    },
  },

  // ── C# ──────────────────────────────────────────────────────────────────
  '.cs': {
    filePath: 'UserService.cs',
    code: `
using System;
using System.Collections.Generic;

public class UserService : BaseService, IUserService, IDisposable {
    private readonly List<string> _users = new List<string>();

    public string GetUser(int id) {
        return _users[id];
    }

    public void AddUser(string name) {
        _users.Add(name);
    }

    public void Dispose() {
        _users.Clear();
    }
}

public interface IUserService {
    string GetUser(int id);
}
`,
    assert(result) {
      assertNode(result, n => n.type === 'FILE', 'FILE node');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'UserService', 'CLASS UserService');
      assertNode(result, n => n.type === 'CLASS' && n.name === 'IUserService', 'CLASS IUserService (interface)');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'UserService.cs#UserService.GetUser', 'FUNCTION UserService.GetUser');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'UserService.cs#UserService.AddUser', 'FUNCTION UserService.AddUser');
      assertNode(result, n => n.type === 'FUNCTION' && n.id === 'UserService.cs#UserService.Dispose', 'FUNCTION UserService.Dispose');

      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'System', 'IMPORTS System');
      assertEdge(result, e => e.relationship === 'IMPORTS' && e.target === 'System.Collections.Generic', 'IMPORTS System.Collections.Generic');

      // C# base_list cannot distinguish class from interface at AST level — all emitted as EXTENDS
      const extendsEdges = result.edges.filter(e => e.relationship === 'EXTENDS' && e.source.includes('UserService'));
      if (extendsEdges.length < 3) {
        throw new Error(`C# EXTENDS edges: expected 3 (BaseService, IUserService, IDisposable), got ${extendsEdges.length}`);
      }
      assertNoEdge(result, e => e.relationship === 'IMPLEMENTS', 'No IMPLEMENTS in C# (indistinguishable from EXTENDS at AST level)');
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== ParserService AST Traversal Smoke Tests ===\n');

  const service = new ParserService();
  await service.onModuleInit();

  let passed = 0;
  let failed = 0;

  for (const [ext, tc] of Object.entries(TEST_CASES)) {
    console.log(`\n── ${ext}: ${tc.filePath} ──`);
    try {
      const result = await service.parseFile(tc.filePath, tc.code);

      // Pretty-print summary
      const files   = result.nodes.filter(n => n.type === 'FILE');
      const classes = result.nodes.filter(n => n.type === 'CLASS');
      const funcs   = result.nodes.filter(n => n.type === 'FUNCTION');
      const imports = result.edges.filter(e => e.relationship === 'IMPORTS');
      const calls   = result.edges.filter(e => e.relationship === 'CALLS');
      const extends_ = result.edges.filter(e => e.relationship === 'EXTENDS');
      const impls   = result.edges.filter(e => e.relationship === 'IMPLEMENTS');

      console.log(`  Files:      ${files.map(n => n.id).join(', ')}`);
      console.log(`  Classes:    ${classes.map(n => n.name).join(', ') || '(none)'}`);
      console.log(`  Functions:  ${funcs.map(n => n.id.split('#')[1] || n.name).join(', ') || '(none)'}`);
      console.log(`  Imports:    ${imports.map(e => e.target).join(', ') || '(none)'}`);
      console.log(`  Extends:    ${extends_.map(e => `${e.source.split('#')[1] || e.source} -> ${e.target}`).join(', ') || '(none)'}`);
      console.log(`  Implements: ${impls.map(e => `${e.source.split('#')[1] || e.source} -> ${e.target}`).join(', ') || '(none)'}`);
      console.log(`  Calls:      ${calls.length} edge(s)${calls.length > 0 ? ' [first: ' + (calls[0].source.split('#')[1] || calls[0].source) + ' -> ' + calls[0].target + ']' : ''}`);

      // Run structured assertions
      tc.assert(result);

      console.log(`  ✓ All assertions passed`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${(error as Error).message}`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
