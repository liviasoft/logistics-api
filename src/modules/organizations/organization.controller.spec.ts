import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';

describe('OrganizationController', () => {
  let controller: OrganizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PrismaModule,
        EventstoreModule,
        EventEmitterModule.forRoot(),
        AsyncStorageModule,
        AuthModule,
        ConfigModule,
      ],
      controllers: [OrganizationController],
      providers: [OrganizationService],
    }).compile();

    controller = module.get<OrganizationController>(OrganizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
