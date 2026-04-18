import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nValidationPipe, I18nValidationExceptionFilter } from 'nestjs-i18n';
import { apiReference } from '@scalar/nestjs-api-reference';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaService } from './datasources/prisma/prisma.service';
import { FeatureFlagsGuard } from './modules/feature-flags/feature-flags.guard';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // rawBody: true makes req.rawBody (Buffer) available for webhook signature verification.
    // It applies a raw body parser alongside the normal JSON parser.
    rawBody: true,
  });

  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);

  // ── Global configuration ────────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning();
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // ── Validation ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new I18nValidationExceptionFilter());

  // ── Feature flags guard ─────────────────────────────────────────────────
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);
  app.useGlobalGuards(new FeatureFlagsGuard(reflector, prisma));

  // ── OpenAPI / Swagger ───────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Template API')
    .setDescription(
      'Minimal NestJS backend template — workflows, queues, WebSockets, webhooks, media',
    )
    .setVersion(process.env.npm_package_version || '1.0.0')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .addServer(`http://localhost:${config.get('PORT', 3001)}`, 'Local')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  app.use('/api/openapi.json', (req, res) => res.json(document));
  app.use(
    '/api/docs',
    apiReference({ spec: { content: document }, theme: 'kepler' }),
  );

  // ── Start ───────────────────────────────────────────────────────────────
  const port = config.get('PORT', 3001);
  await app.listen(port);

  logger.log(`Application:     http://localhost:${port}`);
  logger.log(`API docs:        http://localhost:${port}/api/docs`);
  logger.log(`Queue dashboard: http://localhost:${port}/admin/queues`);
  logger.log(`Health:          http://localhost:${port}/api/health`);
}

bootstrap();
