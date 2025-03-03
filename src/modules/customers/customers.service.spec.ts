import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';
import { PrismaModule } from '../../datasources/prisma/prisma.module';

describe('CustomerService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AsyncStorageModule],
      providers: [CustomersService],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
