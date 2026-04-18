import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Neo4jService } from '../../../datasources/neo4j/neo4j.service';

@Injectable()
export class Neo4jHealthIndicator extends HealthIndicator {
  constructor(private readonly neo4j: Neo4jService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Simple query to verify connectivity
      await this.neo4j.runQuery('RETURN 1 AS result');
      return this.getStatus(key, true);
    } catch (error) {
      // Neo4j is optional, so we return unhealthy but don't throw
      // This allows the app to run without Neo4j
      return this.getStatus(key, false, {
        message: error.message || 'Neo4j unavailable',
      });
    }
  }
}
