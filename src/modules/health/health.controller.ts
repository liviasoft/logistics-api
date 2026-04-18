import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { EventStoreHealthIndicator } from './indicators/eventstore.health';
import { Neo4jHealthIndicator } from './indicators/neo4j.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaHealthIndicator,
    private eventStore: EventStoreHealthIndicator,
    private neo4j: Neo4jHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check of all services' })
  check() {
    return this.health.check([
      // Database checks
      () => this.prisma.isHealthy('postgres'),
      () => this.eventStore.isHealthy('eventstore'),
      () => this.neo4j.isHealthy('neo4j'),

      // System checks
      () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024), // 256MB
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024), // 512MB
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe - is the service running?' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe - is the service ready to accept traffic?' })
  ready() {
    return this.health.check([
      () => this.prisma.isHealthy('postgres'),
      () => this.eventStore.isHealthy('eventstore'),
    ]);
  }
}
