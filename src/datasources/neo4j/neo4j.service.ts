import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, Record as Neo4jRecord } from 'neo4j-driver';

export interface NodeResult {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface RelationshipResult {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  startNodeId: string;
  endNodeId: string;
}

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;
  private readonly logger = new Logger(Neo4jService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>(
      'NEO4J_URI',
      'bolt://localhost:7687',
    );
    const user = this.configService.get<string>('NEO4J_USER', 'neo4j');
    const password = this.configService.get<string>(
      'NEO4J_PASSWORD',
      'password',
    );

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

    try {
      await this.driver.verifyConnectivity();
      this.logger.log('Neo4j connection established');
    } catch (error) {
      this.logger.warn(`Neo4j connection failed: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.logger.log('Neo4j connection closed');
    }
  }

  private getSession(): Session {
    return this.driver.session();
  }

  private parseNode(record: Neo4jRecord, alias = 'n'): NodeResult {
    const node = record.get(alias);
    return {
      id: node.elementId,
      labels: node.labels,
      properties: node.properties,
    };
  }

  private parseRelationship(
    record: Neo4jRecord,
    alias = 'r',
  ): RelationshipResult {
    const rel = record.get(alias);
    return {
      id: rel.elementId,
      type: rel.type,
      properties: rel.properties,
      startNodeId: rel.startNodeElementId,
      endNodeId: rel.endNodeElementId,
    };
  }

  // ============ NODE OPERATIONS ============

  async createNode(
    label: string,
    properties: Record<string, unknown>,
  ): Promise<NodeResult> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `CREATE (n:${label} $properties) RETURN n`,
        { properties },
      );
      return this.parseNode(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async getNodeById(label: string, id: string): Promise<NodeResult | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n:${label}) WHERE elementId(n) = $id RETURN n`,
        { id },
      );
      if (result.records.length === 0) return null;
      return this.parseNode(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async getNodes(
    label: string,
    filters: Record<string, unknown> = {},
    limit = 100,
    skip = 0,
  ): Promise<NodeResult[]> {
    const session = this.getSession();
    try {
      const filterKeys = Object.keys(filters);
      const whereClause =
        filterKeys.length > 0
          ? 'WHERE ' + filterKeys.map((k) => `n.${k} = $${k}`).join(' AND ')
          : '';

      const result = await session.run(
        `MATCH (n:${label}) ${whereClause} RETURN n SKIP $skip LIMIT $limit`,
        { ...filters, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return result.records.map((r) => this.parseNode(r));
    } finally {
      await session.close();
    }
  }

  async updateNode(
    label: string,
    id: string,
    properties: Record<string, unknown>,
  ): Promise<NodeResult | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n:${label}) WHERE elementId(n) = $id SET n += $properties RETURN n`,
        { id, properties },
      );
      if (result.records.length === 0) return null;
      return this.parseNode(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async deleteNode(label: string, id: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n:${label}) WHERE elementId(n) = $id DETACH DELETE n RETURN count(n) as deleted`,
        { id },
      );
      const deleted = result.records[0]?.get('deleted');
      return deleted?.toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  // ============ RELATIONSHIP OPERATIONS ============

  async createRelationship(
    fromLabel: string,
    fromId: string,
    toLabel: string,
    toId: string,
    relationshipType: string,
    properties: Record<string, unknown> = {},
  ): Promise<RelationshipResult | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (a:${fromLabel}), (b:${toLabel})
         WHERE elementId(a) = $fromId AND elementId(b) = $toId
         CREATE (a)-[r:${relationshipType} $properties]->(b)
         RETURN r`,
        { fromId, toId, properties },
      );
      if (result.records.length === 0) return null;
      return this.parseRelationship(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async getRelationshipById(id: string): Promise<RelationshipResult | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH ()-[r]->() WHERE elementId(r) = $id RETURN r`,
        { id },
      );
      if (result.records.length === 0) return null;
      return this.parseRelationship(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async getRelationships(
    relationshipType: string,
    filters: Record<string, unknown> = {},
    limit = 100,
    skip = 0,
  ): Promise<RelationshipResult[]> {
    const session = this.getSession();
    try {
      const filterKeys = Object.keys(filters);
      const whereClause =
        filterKeys.length > 0
          ? 'WHERE ' + filterKeys.map((k) => `r.${k} = $${k}`).join(' AND ')
          : '';

      const result = await session.run(
        `MATCH ()-[r:${relationshipType}]->() ${whereClause} RETURN r SKIP $skip LIMIT $limit`,
        { ...filters, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return result.records.map((r) => this.parseRelationship(r));
    } finally {
      await session.close();
    }
  }

  async updateRelationship(
    id: string,
    properties: Record<string, unknown>,
  ): Promise<RelationshipResult | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH ()-[r]->() WHERE elementId(r) = $id SET r += $properties RETURN r`,
        { id, properties },
      );
      if (result.records.length === 0) return null;
      return this.parseRelationship(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async deleteRelationship(id: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH ()-[r]->() WHERE elementId(r) = $id DELETE r RETURN count(r) as deleted`,
        { id },
      );
      const deleted = result.records[0]?.get('deleted');
      return deleted?.toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  // ============ QUERY HELPERS ============

  async runQuery<T = Neo4jRecord[]>(
    cypher: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const session = this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result.records as T;
    } finally {
      await session.close();
    }
  }

  async getNodeWithRelationships(
    label: string,
    id: string,
    relationshipType?: string,
    direction: 'in' | 'out' | 'both' = 'both',
  ): Promise<{ node: NodeResult; relationships: RelationshipResult[] } | null> {
    const session = this.getSession();
    try {
      const relPattern = relationshipType ? `:${relationshipType}` : '';
      const dirPattern =
        direction === 'in'
          ? `<-[r${relPattern}]-`
          : direction === 'out'
            ? `-[r${relPattern}]->`
            : `-[r${relPattern}]-`;

      const result = await session.run(
        `MATCH (n:${label}) WHERE elementId(n) = $id
         OPTIONAL MATCH (n)${dirPattern}(m)
         RETURN n, collect(r) as relationships`,
        { id },
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      const node = this.parseNode(record);
      const rels = record.get('relationships') || [];

      return {
        node,
        relationships: rels
          .filter((r: unknown) => r !== null)
          .map(
            (r: {
              elementId: string;
              type: string;
              properties: Record<string, unknown>;
              startNodeElementId: string;
              endNodeElementId: string;
            }) => ({
              id: r.elementId,
              type: r.type,
              properties: r.properties,
              startNodeId: r.startNodeElementId,
              endNodeId: r.endNodeElementId,
            }),
          ),
      };
    } finally {
      await session.close();
    }
  }
}
