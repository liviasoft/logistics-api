import { AllStreamResolvedEvent } from '@eventstore/db-client';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { FeatureFlagEventType } from '../../events/featureFlag.events';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async handleStoredEvents(resolvedEvent: AllStreamResolvedEvent) {
    console.log({ resolvedEvent });
    // switch (resolvedEvent.event.type) {
    // }
    switch (resolvedEvent.event.type) {
      case FeatureFlagEventType.FeatureFlagRegistered:
        {
          // await this.featureFlag.create({
          //   data: { ...(resolvedEvent.event.data) },
          // });
          console.log({ data: resolvedEvent.event.data });
        }

        break;

      default:
        break;
    }
    return;
  }
}
