import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ParserService } from '../parser/parser.service';
import { LLMGatewayClient } from '../clients/llm-gateway.client';
import { KnowledgeGraphClient } from '../clients/knowledge-graph.client';
import { PineconeService } from '../storage/pinecone.service';
import { S3Service } from '../storage/s3.service';
import { HashCacheService } from '../storage/hash-cache.service';
import { KafkaTopics } from '@ai-code-reviewer/kafka';
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
    private readonly hashCache: HashCacheService,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  private readonly EXCLUDED_PATTERNS = [
    /node_modules\//,
    /vendor\//,
    /bower_components\//,
    /dist\//,
    /build\//,
    /\.git\//,
  ];

  private shouldExcludeFile(filePath: string): boolean {
    return this.EXCLUDED_PATTERNS.some((pattern) => pattern.test(filePath));
  }

  /**
   * Processes a merged PR event:
   * 1. Parses AST from changed files
   * 2. Generates embeddings for functions/classes
   * 3. Upserts to Pinecone
   * 4. Uploads raw snapshots to S3
   * 5. Sends graph updates to Knowledge Graph
   */
  async processMergeEvent(payload: any) {
    // 1. Validate payload
    if (!payload || !payload.repo_id || !payload.commit_sha || !Array.isArray(payload.files)) {
      this.logger.error('Invalid merge event payload received, missing required fields', { payload });
      return;
    }

    const { repo_id, commit_sha, files } = payload;
    this.logger.log(`Processing merge event for repo ${repo_id}, commit ${commit_sha}`);

    const graphNodes: any[] = [];
    const graphEdges: any[] = [];
    const pineconeVectors: any[] = [];
    const deletedFilePaths: string[] = [];
    const processedHashes: Map<string, string> = new Map();

    // Segregate changed/added vs removed files
    const changedFiles = files.filter((f: any) => f.status !== 'removed');
    const removedFiles = files.filter((f: any) => f.status === 'removed');

    // 2. Process each changed file
    for (const file of changedFiles) {
      try {
        if (!file.filename || !file.content) {
          this.logger.warn(`Skipping invalid changed file in payload: ${JSON.stringify(file)}`);
          continue;
        }

        if (this.shouldExcludeFile(file.filename)) {
          this.logger.debug(`Skipping excluded path: ${file.filename}`);
          continue;
        }

        // Hash caching for deduplication
        const fileHash = createHash('sha256').update(file.content).digest('hex');
        const isDuplicate = await this.hashCache.isDuplicate(repo_id, file.filename, fileHash);
        if (isDuplicate) {
          this.logger.debug(`Skipping ${file.filename}, content unchanged.`);
          continue;
        }

        // AST Parsing
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

        // Generate Embeddings for nodes
        const textsToEmbed = nodes.map(n => n.content);
        if (textsToEmbed.length > 0) {
          const embeddings = await this.llm.embed(textsToEmbed, repo_id);
          
          // Prepare for Pinecone
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

        // Upload raw snapshot to S3
        await this.s3.uploadSnapshot(repo_id, commit_sha, file.filename, file.content);

        // Save successfully processed file hash locally to update Redis at the end
        processedHashes.set(file.filename, fileHash);
      } catch (error) {
        this.logger.error(`Error processing file ${file.filename}: ${(error as Error).message}`, (error as Error).stack);
      }
    }

    // 3. Process removed files (Batched Deletion)
    if (removedFiles.length > 0) {
      const pathsToDelete = removedFiles
        .map((f: any) => f.filename)
        .filter((filename: any): filename is string => !!filename)
        .filter((filename: string) => !this.shouldExcludeFile(filename));

      if (pathsToDelete.length > 0) {
        try {
          this.logger.log(`Handling batch deletion for ${pathsToDelete.length} files`);
          
          // A. Batched Pinecone Deletion using $in operator
          await this.pinecone.deleteVectorsByFiles(repo_id, pathsToDelete);
          
          // B. Clear Hash cache in Redis for each deleted file
          for (const filename of pathsToDelete) {
            await this.hashCache.clearCache(repo_id, filename);
            deletedFilePaths.push(filename);
          }
        } catch (error) {
          this.logger.error(`Failed to handle batch deletion: ${(error as Error).message}`);
        }
      }
    }

    // Upsert vectors
    if (pineconeVectors.length > 0) {
      await this.pinecone.upsertVectors(repo_id, pineconeVectors);
    }

    // Send graph patch (including deleted_file_paths)
    if (graphNodes.length > 0 || graphEdges.length > 0 || deletedFilePaths.length > 0) {
      await this.kg.patchGraph({
        repo_id,
        nodes: graphNodes,
        edges: graphEdges,
        deleted_node_ids: [],
        deleted_file_paths: deletedFilePaths,
      });
    }

    // Update hashes in cache for successfully processed files
    for (const [filename, fileHash] of processedHashes.entries()) {
      try {
        await this.hashCache.updateHash(repo_id, filename, fileHash);
      } catch (error) {
        this.logger.warn(`Failed to update hash for ${filename}: ${(error as Error).message}`);
      }
    }

    // Emit Eventual Consistency event
    this.kafkaClient.emit(KafkaTopics.PR_EVENTS_INDEXED, {
      repo_id,
      commit_sha,
      timestamp: new Date().toISOString()
    });

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
