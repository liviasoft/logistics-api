import { Module } from '@nestjs/common';
import { DevelopersService } from './developers.service';
import { DevelopersController } from './developers.controller';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';

@Module({
  imports: [AsyncStorageModule],
  controllers: [DevelopersController],
  providers: [DevelopersService],
  exports: [DevelopersService],
})
export class DevelopersModule {}
