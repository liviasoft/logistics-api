import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { EventStoreHealthIndicator } from './indicators/eventstore.health';
import { Neo4jHealthIndicator } from './indicators/neo4j.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    EventStoreHealthIndicator,
    Neo4jHealthIndicator,
  ],
})
export class HealthModule {}
