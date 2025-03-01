import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { RolesGuard } from './roles.guard';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

describe('RolesGuard', () => {
  it('should be defined', () => {
    expect(
      new RolesGuard(
        new Reflector(),
        new AsyncStorageService(),
        new ConfigService(),
      ),
    ).toBeDefined();
  });
});
