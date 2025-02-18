import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { ConfigModule } from '@nestjs/config';

describe('FeatureFlagsController', () => {
  let controller: FeatureFlagsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, EventstoreModule, ConfigModule],
      controllers: [FeatureFlagsController],
      providers: [FeatureFlagsService],
    }).compile();

    controller = module.get<FeatureFlagsController>(FeatureFlagsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
