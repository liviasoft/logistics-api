import { Test, TestingModule } from '@nestjs/testing';
import { ClientAppService } from './client-app.service';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { OrganizationModule } from '../organizations/organization.module';

describe('ClientAppService', () => {
  let service: ClientAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        PrismaModule,
        EventstoreModule,
        EventEmitterModule.forRoot(),
        OrganizationModule,
      ],
      providers: [ClientAppService],
    }).compile();

    service = module.get<ClientAppService>(ClientAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
