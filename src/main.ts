import { NestFactory, Reflector } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { FeatureFlagsService } from './modules/feature-flags/feature-flags.service';
import { FeatureFlagsGuard } from './modules/feature-flags/feature-flags.guard';
import { PrismaService } from './datasources/prisma/prisma.service';
import { DevelopersService } from './modules/developers/developers.service';
import { RolesGuard } from './modules/roles/roles.guard';
import { AsyncStorageService } from './common/async-storage/async-storage.service';
import { ConfigService } from '@nestjs/config';
import { OrganizationService } from './modules/organizations/organization.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);
  const asyncStorage = app.get(AsyncStorageService);
  const configService = app.get(ConfigService);
  app.use(cookieParser());
  app.useGlobalGuards(
    new FeatureFlagsGuard(reflector, prisma),
    new RolesGuard(reflector, asyncStorage, configService),
  );
  await app.listen(process.env.PORT ?? 3000, async () => {
    const featureFlagService = app.get(FeatureFlagsService);
    const developersService = app.get(DevelopersService);
    const organizationService = app.get(OrganizationService);
    featureFlagService.subscribeToEvents();
    developersService.subscribeToEvents();
    organizationService.subscribeToEvents();
  });
}
bootstrap();
