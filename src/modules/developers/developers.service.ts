import { Injectable, Logger } from '@nestjs/common';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { BaseService } from '../../common/base.service';
import { ResolvedEvent } from '@eventstore/db-client';
import { DeveloperEventType } from '../../events/developer.events';
import { DeveloperSignupDto } from '../auth/dto/developer-signup.dto';
import {
  DEVELOPER_RESOURCE,
  STREAM_BY_CATEGORY_PREFIX,
} from '../../common/constants';

@Injectable()
export class DevelopersService extends BaseService {
  private readonly logger = new Logger(DevelopersService.name, {
    timestamp: true,
  });
  constructor(
    private prisma: PrismaService,
    private eventStore: EventstoreService,
  ) {
    super();
  }

  // Events
  async subscribeToEvents() {
    this.logger.log(
      `Subscribed to ${STREAM_BY_CATEGORY_PREFIX}-${DEVELOPER_RESOURCE} events`,
    );
    try {
      const subscription = await this.eventStore.subscribeToStream(
        `${STREAM_BY_CATEGORY_PREFIX}-${DEVELOPER_RESOURCE}`,
        {
          fromRevision: 'end',
          resolveLinkTos: true,
        },
      );
      for await (const resolvedEvent of subscription) {
        this.handleStreamEvents(resolvedEvent);
      }
    } catch (error: any) {
      this.logger.error(error);
    }
  }

  async handleStreamEvents(event: ResolvedEvent) {
    const {
      created,
      data: eventData,
      revision,
      type: lastEventType,
      id: lastEventId,
      streamId: lastStreamId,
    } = event.event;
    switch (lastEventType) {
      case DeveloperEventType.DeveloperSignedUp:
        {
          const { name, password, email, id } =
            eventData as unknown as DeveloperSignupDto;

          await this.prisma.developerAccount.create({
            data: {
              createdAt: created,
              name,
              password,
              email,
              id,
              revision: Number(revision.toString()),
              lastEventId,
              lastEventType,
              lastStreamId,
            },
          });
        }
        break;
      default:
        break;
    }
  }
}
