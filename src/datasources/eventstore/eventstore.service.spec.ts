import { Test, TestingModule } from '@nestjs/testing';
import { EventstoreService } from './eventstore.service';

describe('EventstoreService', () => {
  let service: EventstoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventstoreService],
    }).compile();

    service = module.get<EventstoreService>(EventstoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
