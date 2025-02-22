import { Test, TestingModule } from '@nestjs/testing';
import { DevelopersController } from './developers.controller';
import { DevelopersService } from './developers.service';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { PrismaModule } from '../../datasources/prisma/prisma.module';

describe('DevelopersController', () => {
  let controller: DevelopersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, EventstoreModule],
      controllers: [DevelopersController],
      providers: [DevelopersService],
    }).compile();

    controller = module.get<DevelopersController>(DevelopersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
