/**
 * Smoke test for ParserService AST walking and normalization logic.
 *
 * Run with:  npx ts-node --project apps/intelligence/code-indexer/tsconfig.app.json apps/intelligence/code-indexer/src/app/parser/parser.smoke-test.ts
 */

import { ParserService } from './parser.service';

const SAMPLES: Record<string, { filePath: string; code: string }> = {
  '.ts': {
    filePath: 'example.ts',
    code: `
import { Injectable } from '@nestjs/common';

export class UserService {
  private users: string[] = [];

  async getUser(id: number): Promise<string> {
    return this.users[id];
  }

  addUser(name: string): void {
    this.users.push(name);
  }
}
`,
  },
  '.py': {
    filePath: 'example.py',
    code: `
import os
from pathlib import Path

class FileProcessor(BaseProcessor):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)

    def process(self, filename: str) -> str:
        full_path = self.base_dir / filename
        return os.path.basename(str(full_path))
`,
  },
  '.java': {
    filePath: 'Example.java',
    code: `
import java.util.List;

public class UserController extends BaseController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    public String getUser(int id) {
        return service.findById(id);
    }
}
`,
  },
  '.go': {
    filePath: 'main.go',
    code: `
package main

import "fmt"

type Server struct {
    Port int
    Host string
}

func (s *Server) Start() {
    fmt.Printf("Starting on %s:%d\\n", s.Host, s.Port)
}

func main() {
    s := Server{Port: 8080, Host: "localhost"}
    s.Start()
}
`,
  },
  '.rs': {
    filePath: 'lib.rs',
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
`,
  },
  '.cs': {
    filePath: 'UserService.cs',
    code: `
using System;
using System.Collections.Generic;

public class UserService : IService {
    private readonly List<string> _users = new List<string>();

    public string GetUser(int id) {
        return _users[id];
    }

    public void AddUser(string name) {
        _users.Add(name);
    }
}
`,
  },
};

async function main() {
  console.log('=== ParserService AST Traversal Integration Test ===\n');

  // Initialize service
  const service = new ParserService();
  await service.onModuleInit();

  let passed = 0;
  let failed = 0;

  for (const [ext, sample] of Object.entries(SAMPLES)) {
    console.log(`\n── Testing: ${sample.filePath} ──`);
    try {
      const result = await service.parseFile(sample.filePath, sample.code);

      console.log(`✅ Extraction Successful!`);
      
      // Print files / modules
      const fileNodes = result.nodes.filter(n => n.type === 'FILE');
      console.log(`  📂 Files (${fileNodes.length}):`);
      fileNodes.forEach(n => console.log(`     - ID: ${n.id} (lines ${n.start_line}-${n.end_line})`));

      // Print classes
      const classNodes = result.nodes.filter(n => n.type === 'CLASS');
      console.log(`  🏛️ Classes/Structs (${classNodes.length}):`);
      classNodes.forEach(n => console.log(`     - Name: "${n.name}", ID: ${n.id}`));

      // Print functions
      const funcNodes = result.nodes.filter(n => n.type === 'FUNCTION');
      console.log(`  ⚙️ Functions/Methods (${funcNodes.length}):`);
      funcNodes.forEach(n => console.log(`     - Name: "${n.name}", ID: ${n.id}`));

      // Print imports
      const importEdges = result.edges.filter(e => e.relationship === 'IMPORTS');
      console.log(`  📥 Imports (${importEdges.length}):`);
      importEdges.forEach(e => console.log(`     - Target: "${e.target}"`));

      // Print calls
      const callEdges = result.edges.filter(e => e.relationship === 'CALLS');
      console.log(`  📞 Calls (${callEdges.length}):`);
      callEdges.slice(0, 5).forEach(e => console.log(`     - Caller: "${e.source.split('#')[1] || e.source}" -> Callee: "${e.target}"`));
      if (callEdges.length > 5) {
        console.log(`     - ... and ${callEdges.length - 5} more calls`);
      }

      // Print extends/inheritance
      const inheritanceEdges = result.edges.filter(e => e.relationship === 'EXTENDS');
      console.log(`  🧬 Inheritance (${inheritanceEdges.length}):`);
      inheritanceEdges.forEach(e => console.log(`     - Subclass: "${e.source.split('#')[1] || e.source}" -> Base: "${e.target}"`));

      // Quick sanity checks
      if (fileNodes.length === 0) throw new Error('Expected at least one FILE node');
      if (classNodes.length === 0) throw new Error('Expected at least one CLASS/STRUCT node');
      if (funcNodes.length === 0) throw new Error('Expected at least one FUNCTION/METHOD node');

      passed++;
    } catch (error) {
      console.log(`❌ Failed testing ${sample.filePath}: ${(error as Error).message}`);
      console.error(error);
      failed++;
    }
  }

  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
