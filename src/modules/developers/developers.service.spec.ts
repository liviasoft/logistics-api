import { Test, TestingModule } from '@nestjs/testing';
import { DevelopersService } from './developers.service';
import { ConfigModule } from '@nestjs/config';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { PrismaModule } from '../../datasources/prisma/prisma.module';

describe('DevelopersService', () => {
  let service: DevelopersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, PrismaModule, EventstoreModule],
      providers: [DevelopersService],
    }).compile();

    service = module.get<DevelopersService>(DevelopersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
