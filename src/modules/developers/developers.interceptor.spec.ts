import { PrismaService } from '../../datasources/prisma/prisma.service';
import { DevelopersInterceptor } from './developers.interceptor';
import { DevelopersService } from './developers.service';
import { ConfigService } from '@nestjs/config';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('DevelopersInterceptor', () => {
  it('should be defined', () => {
    const configService = new ConfigService();
    const prismaService = new PrismaService(configService);
    const eventstoreService = new EventstoreService(configService);
    const eventEmitter = new EventEmitter2();
    expect(
      new DevelopersInterceptor(
        new DevelopersService(prismaService, eventstoreService, eventEmitter),
      ),
    ).toBeDefined();
  });
});
