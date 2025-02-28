import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { PrismaModule } from './datasources/prisma/prisma.module';
import { EventstoreModule } from './datasources/eventstore/eventstore.module';
import { Neo4jModule } from './datasources/neo4j/neo4j.module';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DevelopersModule } from './modules/developers/developers.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { AsyncStorageMiddleware } from './common/async-storage/async-storage.middleware';
import { CustomerModule } from './modules/customer/customer.module';
import { AsyncStorageModule } from './common/async-storage/async-storage.module';

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
    AuthModule,
    RolesModule,
    CustomerModule,
    AsyncStorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AsyncStorageMiddleware).forRoutes('*');
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
