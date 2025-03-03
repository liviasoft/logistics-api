import { PrismaService } from '../../datasources/prisma/prisma.service';
import { ClientAppInterceptor } from './client-app.interceptor';
import { ClientAppService } from './client-app.service';
import { ConfigService } from '@nestjs/config';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ClientAppInterceptor', () => {
  it('should be defined', () => {
    const configService = new ConfigService();
    const prismaService = new PrismaService(configService);
    const eventstoreService = new EventstoreService(configService);
    const eventEmitter = new EventEmitter2();
    expect(
      new ClientAppInterceptor(
        new ClientAppService(
          prismaService,
          eventstoreService,
          eventEmitter,
          configService,
        ),
      ),
    ).toBeDefined();
  });
});
