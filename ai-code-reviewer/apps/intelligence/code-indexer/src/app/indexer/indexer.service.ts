import { Injectable, Logger } from '@nestjs/common';
import { ParserService } from '../parser/parser.service';
import { LLMGatewayClient } from '../clients/llm-gateway.client';
import { KnowledgeGraphClient } from '../clients/knowledge-graph.client';
import { PineconeService } from '../storage/pinecone.service';
import { S3Service } from '../storage/s3.service';
import { createHash } from 'crypto';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    private readonly parser: ParserService,
    private readonly llm: LLMGatewayClient,
    private readonly kg: KnowledgeGraphClient,
    private readonly pinecone: PineconeService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Processes a merged PR event:
   * 1. Parses AST from changed files
   * 2. Generates embeddings for functions/classes
   * 3. Upserts to Pinecone
   * 4. Uploads raw snapshots to S3
   * 5. Sends graph updates to Knowledge Graph
   */
  async processMergeEvent(payload: any) {
    const { repo_id, commit_sha, files } = payload;
    this.logger.log(`Processing merge event for repo ${repo_id}, commit ${commit_sha}`);

    const graphNodes: any[] = [];
    const graphEdges: any[] = [];
    const pineconeVectors: any[] = [];

    // Process each changed file
    for (const file of files) {
      if (file.status === 'removed') continue; // Handle deletions separately

      // 1. AST Parsing
      const { nodes, edges } = await this.parser.parseFile(file.filename, file.content);
      
      // Map to Knowledge Graph node format
      nodes.forEach(node => {
        graphNodes.push({
          id: node.id,
          type: node.type,
          name: node.name,
          file_path: file.filename,
          repo_id,
        });
      });
      edges.forEach(edge => graphEdges.push(edge));

      // 2. Generate Embeddings for nodes
      const textsToEmbed = nodes.map(n => n.content);
      if (textsToEmbed.length > 0) {
        const embeddings = await this.llm.embed(textsToEmbed, repo_id);
        
        // 3. Prepare for Pinecone
        nodes.forEach((node, index) => {
          pineconeVectors.push({
            id: node.id,
            values: embeddings[index],
            metadata: {
              repo_id,
              file_path: file.filename,
              type: node.type,
              name: node.name,
              commit_sha,
            },
          });
        });
      }

      // 4. Upload raw snapshot to S3
      await this.s3.uploadSnapshot(repo_id, commit_sha, file.filename, file.content);
    }

    // Upsert vectors
    if (pineconeVectors.length > 0) {
      await this.pinecone.upsertVectors(repo_id, pineconeVectors);
    }

    // 5. Send graph patch
    if (graphNodes.length > 0 || graphEdges.length > 0) {
      await this.kg.patchGraph({
        repo_id,
        nodes: graphNodes,
        edges: graphEdges,
        deleted_node_ids: [], // Would populate based on removed files/functions
      });
    }

    this.logger.log(`Finished processing merge event for repo ${repo_id}`);
  }

  /**
   * Manual full repo re-indexing
   */
  async indexRepository(repoId: string, files: any[]) {
    this.logger.log(`Starting full index for repo ${repoId}`);
    // Reuse the merge event logic for now, treating the full repo as one giant merge
    await this.processMergeEvent({
      repo_id: repoId,
      commit_sha: 'manual-index',
      files,
    });
  }
}
