import { PrismaService } from '../../datasources/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CustomersService } from './customers.service';
import { CustomersInterceptor } from './customers.interceptor';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';

describe('CustomersInterceptor', () => {
  it('should be defined', () => {
    const configService = new ConfigService();
    const prismaService = new PrismaService(configService);
    const asyncStorageService = new AsyncStorageService();
    expect(
      new CustomersInterceptor(
        new CustomersService(asyncStorageService, prismaService),
      ),
    ).toBeDefined();
  });
});
