import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CacheService } from '../cache/cache.service';
import { GraphPatch } from './graph.schemas';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cache: CacheService,
  ) {}

  /**
   * GET /callers/{fn_id}
   * Find all functions that call a given function.
   */
  async getCallers(fnId: string) {
    const cacheKey = `callers:${fnId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const results = await this.neo4j.read(
      `MATCH (caller)-[:CALLS]->(fn {id: $fnId})
       RETURN caller.id AS id, caller.name AS name, caller.file_path AS file_path`,
      { fnId },
    );

    await this.cache.set(cacheKey, results);
    return results;
  }

  /**
   * GET /dependencies/{module_id}
   * Find all dependencies of a module.
   */
  async getDependencies(moduleId: string) {
    const cacheKey = `deps:${moduleId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const results = await this.neo4j.read(
      `MATCH (m {id: $moduleId})-[:IMPORTS|DEPENDS_ON]->(dep)
       RETURN dep.id AS id, dep.name AS name, dep.type AS type, dep.file_path AS file_path`,
      { moduleId },
    );

    await this.cache.set(cacheKey, results);
    return results;
  }

  /**
   * GET /impact/{fn_id}
   * Calculate the blast radius — what is affected if this function changes.
   */
  async getImpact(fnId: string) {
    const cacheKey = `impact:${fnId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const results = await this.neo4j.read(
      `MATCH (fn {id: $fnId})<-[:CALLS*1..3]-(affected)
       RETURN DISTINCT affected.id AS id, affected.name AS name,
              affected.file_path AS file_path, affected.type AS type`,
      { fnId },
    );

    const impact = {
      function_id: fnId,
      affected_count: results.length,
      affected: results,
    };

    await this.cache.set(cacheKey, impact);
    return impact;
  }

  /**
   * GET /risk/{file_path}
   * Get historical bug density for a file.
   */
  async getRisk(filePath: string) {
    const cacheKey = `risk:${filePath}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const results = await this.neo4j.read(
      `MATCH (f:FILE {file_path: $filePath})
       OPTIONAL MATCH (f)-[:HAS_BUG]->(b)
       RETURN f.file_path AS file_path,
              count(b) AS bug_count,
              f.last_modified AS last_modified`,
      { filePath },
    );

    const risk = results[0] || { file_path: filePath, bug_count: 0, last_modified: null };
    await this.cache.set(cacheKey, risk);
    return risk;
  }

  /**
   * GET /recent-changes/{repo_id}
   * Get recently changed files in a repo.
   */
  async getRecentChanges(repoId: string) {
    const cacheKey = `recent:${repoId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const results = await this.neo4j.read(
      `MATCH (f:FILE {repo_id: $repoId})
       WHERE f.last_modified IS NOT NULL
       RETURN f.id AS id, f.name AS name, f.file_path AS file_path,
              f.last_modified AS last_modified
       ORDER BY f.last_modified DESC
       LIMIT 50`,
      { repoId },
    );

    await this.cache.set(cacheKey, results);
    return results;
  }

  /**
   * POST /graph/patch
   * Apply graph updates from Code Indexer.
   * This is the WRITE path — sole Neo4j writer in the system.
   */
  async applyPatch(patch: GraphPatch) {
    this.logger.log(
      `Applying patch for repo ${patch.repo_id}: ${patch.nodes.length} nodes, ${patch.edges.length} edges, ${patch.deleted_node_ids.length} deletions, ${patch.deleted_file_paths?.length || 0} file deletions`,
    );

    // 1. Delete removed nodes
    if (patch.deleted_node_ids.length > 0) {
      await this.neo4j.write(
        `UNWIND $ids AS nodeId
         MATCH (n {id: nodeId, repo_id: $repoId})
         DETACH DELETE n`,
        { ids: patch.deleted_node_ids, repoId: patch.repo_id },
      );
    }

    // 1b. Delete removed files (Option 2 - File-path based deletion)
    if (patch.deleted_file_paths && patch.deleted_file_paths.length > 0) {
      await this.neo4j.write(
        `UNWIND $filePaths AS filePath
         MATCH (n {file_path: filePath, repo_id: $repoId})
         DETACH DELETE n`,
        { filePaths: patch.deleted_file_paths, repoId: patch.repo_id },
      );
    }

    // 2. Upsert nodes (MERGE to avoid duplicates)
    if (patch.nodes.length > 0) {
      await this.neo4j.write(
        `UNWIND $nodes AS node
         MERGE (n {id: node.id, repo_id: node.repo_id})
         SET n.name = node.name,
             n.type = node.type,
             n.file_path = node.file_path,
             n.last_modified = timestamp()
         SET n += node.properties`,
        { nodes: patch.nodes.map((n) => ({ ...n, properties: n.properties || {} })) },
      );
    }

    // 3. Upsert edges
    if (patch.edges.length > 0) {
      for (const edge of patch.edges) {
        await this.neo4j.write(
          `MATCH (source {id: $source}), (target {id: $target})
           MERGE (source)-[r:${edge.relationship}]->(target)
           SET r += $properties`,
          {
            source: edge.source,
            target: edge.target,
            properties: edge.properties || {},
          },
        );
      }
    }

    this.logger.log(`Patch applied successfully for repo ${patch.repo_id}`);
    return { status: 'applied', repo_id: patch.repo_id };
  }
}
