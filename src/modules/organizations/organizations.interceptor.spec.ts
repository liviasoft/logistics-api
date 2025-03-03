import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { OrganizationService } from './organization.service';
import { OrganizationsInterceptor } from './organizations.interceptor';

describe('OrganizationsInterceptor', () => {
  it('should be defined', () => {
    const configService = new ConfigService();
    const prismaService = new PrismaService(configService);
    const eventStoreService = new EventstoreService(configService);
    const eventEmitter = new EventEmitter2();
    expect(
      new OrganizationsInterceptor(
        new OrganizationService(prismaService, eventStoreService, eventEmitter),
      ),
    ).toBeDefined();
  });
});
