import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from './customer.service';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';
import { PrismaModule } from '../../datasources/prisma/prisma.module';

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AsyncStorageModule],
      providers: [CustomerService],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
