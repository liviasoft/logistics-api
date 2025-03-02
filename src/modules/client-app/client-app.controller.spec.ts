import { Test, TestingModule } from '@nestjs/testing';
import { ClientAppController } from './client-app.controller';
import { ClientAppService } from './client-app.service';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';

describe('ClientAppController', () => {
  let controller: ClientAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PrismaModule,
        EventstoreModule,
        AsyncStorageModule,
        EventEmitterModule.forRoot(),
      ],
      controllers: [ClientAppController],
      providers: [ClientAppService],
    }).compile();

    controller = module.get<ClientAppController>(ClientAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
