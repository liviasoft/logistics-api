import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';

@Module({
  imports: [AsyncStorageModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomerModule {}
