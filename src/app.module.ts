import { join } from 'path';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import {
  AcceptLanguageResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { AsyncStorageLocaleResolver } from './common/i18n/async-storage-locale.resolver';
import { HooksModule } from './common/hooks/hooks.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Infrastructure
import { PrismaModule } from './datasources/prisma/prisma.module';
import { EventstoreModule } from './datasources/eventstore/eventstore.module';
import { Neo4jModule } from './datasources/neo4j/neo4j.module';
import { RedisModule } from './datasources/redis/redis.module';
import { WorkflowModule } from './common/workflows';
import { QueuesModule } from './common/queues/queues.module';
// Core
import { AsyncStorageModule } from './common/async-storage/async-storage.module';
import { AsyncStorageMiddleware } from './common/async-storage/async-storage.middleware';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { UsersModule } from './modules/users/users.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { MediaModule } from './modules/media/media.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { ExampleModule } from './modules/example/example.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(), // Enables @Cron, @Interval, @Timeout decorators

    // Internationalisation — resolvers run in order; first non-undefined result wins
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        // __dirname is src/ in dev (ts-node) and dist/ in prod (compiled).
        // nest-cli copies i18n assets to dist/i18n via the assets config in nest-cli.json.
        path: join(__dirname, 'i18n/'),
        watch: true,
      },
      resolvers: [
        AsyncStorageLocaleResolver,           // locale from AsyncLocalStorage (set by middleware)
        { use: QueryResolver, options: { lang: 'lang' } }, // ?lang=fr
        AcceptLanguageResolver,               // Accept-Language header
      ],
    }),

    // Infrastructure (datasources)
    PrismaModule,
    EventstoreModule,
    Neo4jModule,
    RedisModule,      // Global Redis service
    HooksModule,      // Global hook system (before*/after* lifecycle hooks)
    WorkflowModule,
    QueuesModule,     // BullMQ queues + Bull Board dashboard

    // Core modules
    AsyncStorageModule,
    HealthModule,
    FeatureFlagsModule,

    // Settings (global — injectable everywhere without explicit import)
    SettingsModule,

    // Auth & Users
    AuthModule,
    UsersModule,

    // Real-time
    GatewayModule, // Socket.io WebSocket gateway

    // Media
    MediaModule, // Sharp image processing

    // Webhooks (inbound + outbound)
    WebhooksModule,

    // Payments (Stripe / Adyen / Paystack — set PAYMENT_PROVIDER env var)
    PaymentsModule,

    // Notifications (Resend / SendGrid / Twilio — set NOTIFICATION_PROVIDER env var)
    NotificationsModule,

    // File Storage (local / S3 / R2 — set STORAGE_PROVIDER env var)
    StorageModule,

    // Subscribers — domain event listeners (user.registered, payment.succeeded, etc.)
    SubscribersModule,

    // Example module — demonstrates all template features with working code.
    // Delete this when building your real domain.
    ExampleModule,
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
