import { ConfigService } from '@nestjs/config';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { FeatureFlagsInterceptor } from './feature-flags.interceptor';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsInterceptor', () => {
  it('should be defined', () => {
    const configService = new ConfigService();
    const prismaService = new PrismaService(configService);
    const eventstoreService = new EventstoreService(configService);
    expect(
      new FeatureFlagsInterceptor(
        new FeatureFlagsService(prismaService, eventstoreService),
      ),
    ).toBeDefined();
  });
});
