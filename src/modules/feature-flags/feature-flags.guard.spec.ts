import { Reflector } from '@nestjs/core';
import { FeatureFlagsGuard } from './feature-flags.guard';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('FeatureFlagsGuard', () => {
  it('should be defined', () => {
    expect(
      new FeatureFlagsGuard(
        new Reflector(),
        new PrismaService(new ConfigService()),
      ),
    ).toBeDefined();
  });
});
