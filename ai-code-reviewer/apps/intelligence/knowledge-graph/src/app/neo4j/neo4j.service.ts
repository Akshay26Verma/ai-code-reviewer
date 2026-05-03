import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver!: Driver;

  async onModuleInit() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

    try {
      await this.driver.verifyConnectivity();
      this.logger.log(`Connected to Neo4j at ${uri}`);
    } catch (error) {
      this.logger.error(`Failed to connect to Neo4j: ${error}`);
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.logger.log('Neo4j connection closed');
    }
  }

  getSession(): Session {
    return this.driver.session();
  }

  /**
   * Execute a read query with parameters.
   */
  async read<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
    const session = this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query with parameters.
   * This is the SOLE Neo4j writer in the entire system.
   */
  async write<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
    const session = this.getSession();
    try {
      const result = await session.executeWrite((tx) => tx.run(cypher, params));
      return result.records.map((record) => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Check if Neo4j is reachable.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }
}
