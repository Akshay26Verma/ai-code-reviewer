/**
 * Smoke test for the knowledge-graph service.
 *
 * Requires a real Neo4j (AuraDB) instance — credentials loaded from .env.
 * Run via: npx nx run knowledge-graph:smoke-test
 *
 * All test data is written under repo_id='smoke-test' and cleaned up at start + end.
 */

import * as dotenv from 'dotenv';

// Must run before onModuleInit reads process.env
dotenv.config({ path: '.env' });

import { Neo4jService } from './neo4j/neo4j.service';
import { GraphService } from './graph/graph.service';
import { GraphPatch, GraphPatchSchema, GraphNodeSchema, GraphEdgeSchema } from './graph/graph.schemas';
import { ZodError } from 'zod';

// ─── assertion helpers ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label: string, detail: string) {
  console.error(`  ✗ ${label}: ${detail}`);
  failed++;
}

async function test(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(label);
  } catch (e: any) {
    fail(label, e.message ?? String(e));
  }
}

function assertZodValid(label: string, fn: () => void) {
  try {
    fn();
    pass(label);
  } catch (e: any) {
    fail(label, e.message ?? String(e));
  }
}

function assertZodInvalid(label: string, fn: () => void) {
  try {
    fn();
    fail(label, 'Expected ZodError but no error was thrown');
  } catch (e) {
    if (e instanceof ZodError) {
      pass(label);
    } else {
      fail(label, `Expected ZodError but got: ${(e as any).message}`);
    }
  }
}

// ─── stubs ────────────────────────────────────────────────────────────────────

const stubCache = {
  get: async (_key: string) => null,
  set: async (_key: string, _val: unknown) => {},
  del: async (_key: string) => {},
};

// ─── node/patch builders ──────────────────────────────────────────────────────

const REPO = 'smoke-test';

function node(
  id: string,
  type: 'CLASS' | 'FUNCTION' | 'MODULE' | 'FILE' | 'PACKAGE',
  name: string,
  file_path: string,
): GraphPatch['nodes'][number] {
  return { id, type, name, file_path, repo_id: REPO };
}

function emptyPatch(overrides: Partial<GraphPatch> = {}): GraphPatch {
  return {
    repo_id: REPO,
    nodes: [],
    edges: [],
    deleted_node_ids: [],
    deleted_file_paths: [],
    ...overrides,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Schema tests (no DB) ──────────────────────────────────────────────────
  console.log('\nSchema validation');

  assertZodValid('1. valid full patch parses without error', () => {
    GraphPatchSchema.parse({
      repo_id: REPO,
      nodes: [{ id: 'n1', type: 'CLASS', name: 'Foo', file_path: 'src/foo.ts', repo_id: REPO }],
      edges: [{ source: 'n1', target: 'n2', relationship: 'CALLS' }],
      deleted_node_ids: ['old-id'],
      deleted_file_paths: ['src/old.ts'],
    });
  });

  assertZodValid('2. defaults: missing arrays default to []', () => {
    const result = GraphPatchSchema.parse({ repo_id: 'r' });
    if (result.nodes.length !== 0) throw new Error('nodes should default to []');
    if (result.edges.length !== 0) throw new Error('edges should default to []');
    if (result.deleted_node_ids.length !== 0) throw new Error('deleted_node_ids should default to []');
    if (result.deleted_file_paths.length !== 0) throw new Error('deleted_file_paths should default to []');
  });

  assertZodInvalid('3. invalid relationship type rejected', () => {
    GraphEdgeSchema.parse({ source: 'a', target: 'b', relationship: 'UNKNOWN' });
  });

  assertZodInvalid('4. node missing required file_path rejected', () => {
    GraphNodeSchema.parse({ id: 'x', type: 'CLASS', name: 'X', repo_id: REPO });
  });

  // ── Neo4j integration tests ───────────────────────────────────────────────
  console.log('\nNeo4j integration (AuraDB)');

  const neo4j = new Neo4jService();
  await neo4j.onModuleInit();
  const svc = new GraphService(neo4j, stubCache as any);

  // Clean up any leftover test data before starting
  await neo4j.write(
    `MATCH (n:ENTITY {repo_id: $repoId}) DETACH DELETE n`,
    { repoId: REPO },
  );

  try {
    await test('5. node upsert: properties written to Neo4j', async () => {
      await svc.applyPatch(emptyPatch({
        nodes: [
          node('smoke:UserService', 'CLASS', 'UserService', 'src/user.service.ts'),
          node('smoke:getUser', 'FUNCTION', 'getUser', 'src/user.service.ts'),
        ],
      }));

      const rows = await neo4j.read<{ name: string; type: string; file_path: string }>(
        `MATCH (n:ENTITY {id: $id, repo_id: $repoId})
         RETURN n.name AS name, n.type AS type, n.file_path AS file_path`,
        { id: 'smoke:UserService', repoId: REPO },
      );
      if (rows.length === 0) throw new Error('Node not found after upsert');
      if (rows[0].name !== 'UserService') throw new Error(`Expected name 'UserService', got '${rows[0].name}'`);
      if (rows[0].type !== 'CLASS') throw new Error(`Expected type 'CLASS', got '${rows[0].type}'`);
    });

    await test('6. node type grouping: CLASS and FUNCTION labels applied correctly', async () => {
      const classNodes = await neo4j.read<{ id: string }>(
        `MATCH (n:ENTITY:CLASS {repo_id: $repoId}) RETURN n.id AS id`,
        { repoId: REPO },
      );
      if (!classNodes.some(r => r.id === 'smoke:UserService')) {
        throw new Error('CLASS label missing on smoke:UserService');
      }

      const fnNodes = await neo4j.read<{ id: string }>(
        `MATCH (n:ENTITY:FUNCTION {repo_id: $repoId}) RETURN n.id AS id`,
        { repoId: REPO },
      );
      if (!fnNodes.some(r => r.id === 'smoke:getUser')) {
        throw new Error('FUNCTION label missing on smoke:getUser');
      }
    });

    await test('7. edge upsert: EXTENDS and IMPLEMENTS created correctly', async () => {
      await svc.applyPatch(emptyPatch({
        nodes: [
          node('smoke:Animal', 'CLASS', 'Animal', 'src/animal.ts'),
          node('smoke:Dog', 'CLASS', 'Dog', 'src/dog.ts'),
          node('smoke:Runnable', 'CLASS', 'Runnable', 'src/runnable.ts'),
        ],
        edges: [
          { source: 'smoke:Dog', target: 'smoke:Animal', relationship: 'EXTENDS' },
          { source: 'smoke:Dog', target: 'smoke:Runnable', relationship: 'IMPLEMENTS' },
        ],
      }));

      const ext = await neo4j.read(
        `MATCH (s:ENTITY {id: $s})-[:EXTENDS]->(t:ENTITY {id: $t}) RETURN t.id AS id`,
        { s: 'smoke:Dog', t: 'smoke:Animal' },
      );
      if (ext.length === 0) throw new Error('EXTENDS edge not found');

      const impl = await neo4j.read(
        `MATCH (s:ENTITY {id: $s})-[:IMPLEMENTS]->(t:ENTITY {id: $t}) RETURN t.id AS id`,
        { s: 'smoke:Dog', t: 'smoke:Runnable' },
      );
      if (impl.length === 0) throw new Error('IMPLEMENTS edge not found');
    });

    await test('8. edge upsert: CALLS created correctly', async () => {
      await svc.applyPatch(emptyPatch({
        nodes: [
          node('smoke:Caller', 'FUNCTION', 'caller', 'src/caller.ts'),
          node('smoke:Callee', 'FUNCTION', 'callee', 'src/callee.ts'),
        ],
        edges: [
          { source: 'smoke:Caller', target: 'smoke:Callee', relationship: 'CALLS' },
        ],
      }));

      const rows = await neo4j.read(
        `MATCH (s:ENTITY {id: $s})-[:CALLS]->(t:ENTITY {id: $t}) RETURN t.id AS id`,
        { s: 'smoke:Caller', t: 'smoke:Callee' },
      );
      if (rows.length === 0) throw new Error('CALLS edge not found');
    });

    await test('9. delete by node id: node removed from graph', async () => {
      await svc.applyPatch(emptyPatch({
        nodes: [node('smoke:ToDeleteById', 'CLASS', 'ToDelete', 'src/temp.ts')],
      }));
      await svc.applyPatch(emptyPatch({ deleted_node_ids: ['smoke:ToDeleteById'] }));

      const rows = await neo4j.read(
        `MATCH (n:ENTITY {id: $id}) RETURN n`,
        { id: 'smoke:ToDeleteById' },
      );
      if (rows.length > 0) throw new Error('Node still exists after deletion by id');
    });

    await test('10. delete by file path: all nodes on that path removed', async () => {
      const fp = 'src/to-delete-by-path.ts';
      await svc.applyPatch(emptyPatch({
        nodes: [
          node('smoke:FilePathA', 'CLASS', 'A', fp),
          node('smoke:FilePathB', 'FUNCTION', 'B', fp),
        ],
      }));
      await svc.applyPatch(emptyPatch({ deleted_file_paths: [fp] }));

      const rows = await neo4j.read(
        `MATCH (n:ENTITY {file_path: $fp, repo_id: $repoId}) RETURN n`,
        { fp, repoId: REPO },
      );
      if (rows.length > 0) throw new Error(`${rows.length} node(s) still exist after file-path deletion`);
    });

    await test('11. empty patch is a no-op (no error thrown)', async () => {
      await svc.applyPatch(emptyPatch());
    });

    await test('12. applyPatch return value is { status: "applied", repo_id }', async () => {
      const result = await svc.applyPatch(emptyPatch());
      if (result.status !== 'applied') throw new Error(`Expected status 'applied', got '${result.status}'`);
      if (result.repo_id !== REPO) throw new Error(`Expected repo_id '${REPO}', got '${result.repo_id}'`);
    });
  } finally {
    // Always clean up test data and close the driver
    await neo4j.write(
      `MATCH (n:ENTITY {repo_id: $repoId}) DETACH DELETE n`,
      { repoId: REPO },
    );
    await neo4j.onModuleDestroy();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(48)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal error during smoke test setup:', err.message ?? err);
  process.exit(1);
});
