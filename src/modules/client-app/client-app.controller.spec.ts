import { Test, TestingModule } from '@nestjs/testing';
import { ClientAppController } from './client-app.controller';
import { ClientAppService } from './client-app.service';

describe('ClientAppController', () => {
  let controller: ClientAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientAppController],
      providers: [ClientAppService],
    }).compile();

    controller = module.get<ClientAppController>(ClientAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
