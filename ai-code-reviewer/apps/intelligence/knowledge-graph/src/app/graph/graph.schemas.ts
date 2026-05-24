import { z } from 'zod';

/**
 * Zod schemas for validating graph patch payloads from Code Indexer.
 * These define the contract for POST /graph/patch.
 */

export const GraphEdgeSchema = z.object({
  source: z.string().describe('Source node ID (e.g., function or module ID)'),
  target: z.string().describe('Target node ID'),
  relationship: z.enum([
    'CALLS',
    'IMPORTS',
    'EXTENDS',
    'IMPLEMENTS',
    'DEPENDS_ON',
    'CROSS_REPO_IMPORTS',
  ]),
  properties: z.record(z.string(), z.any()).optional(),
});

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['FUNCTION', 'CLASS', 'MODULE', 'FILE', 'PACKAGE']),
  name: z.string(),
  file_path: z.string(),
  repo_id: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
});

export const GraphPatchSchema = z.object({
  repo_id: z.string(),
  nodes: z.array(GraphNodeSchema).default([]),
  edges: z.array(GraphEdgeSchema).default([]),
  deleted_node_ids: z.array(z.string()).default([]),
  deleted_file_paths: z.array(z.string()).default([]),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphPatch = z.infer<typeof GraphPatchSchema>;
