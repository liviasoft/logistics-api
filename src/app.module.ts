import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';

@Module({
  imports: [FeatureFlagsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
