import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { FeatureFlagsService } from './modules/feature-flags/feature-flags.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning();
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000, async () => {
    const featureFlagService = app.get(FeatureFlagsService);
    featureFlagService.subscribeToEvents();
  });
}
bootstrap();
