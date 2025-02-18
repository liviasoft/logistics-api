import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { PrismaModule } from './datasources/prisma/prisma.module';
import { EventstoreModule } from './datasources/eventstore/eventstore.module';
import { Neo4jModule } from './datasources/neo4j/neo4j.module';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DevelopersModule } from './modules/developers/developers.module';

@Module({
  imports: [
    FeatureFlagsModule,
    PrismaModule,
    EventstoreModule,
    Neo4jModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DevelopersModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
