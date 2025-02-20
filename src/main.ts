import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { FeatureFlagsService } from './modules/feature-flags/feature-flags.service';
import { FeatureFlagsGuard, FeatureGuard } from './modules/feature-flags/feature-flags.guard';
import { PrismaService } from './datasources/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);
  app.useGlobalGuards(new FeatureFlagsGuard(reflector, prisma));
  app.useGlobalGuards(new FeatureGuard(reflector, prisma));
  await app.listen(process.env.PORT ?? 3000, async () => {
    const featureFlagService = app.get(FeatureFlagsService);
    featureFlagService.subscribeToEvents();
  });
}
bootstrap();
