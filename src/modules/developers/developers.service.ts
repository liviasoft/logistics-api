import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DevelopersService extends BaseService {
  private readonly logger = new Logger(DevelopersService.name, {
    timestamp: true,
  });
  constructor(
    private prisma: PrismaService,
    private eventStore: EventstoreService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async createAccount(accountData: CreateDeveloperDto) {
    const id = this.createResourceId(DEVELOPER_RESOURCE);
    try {
      await this.eventStore.appendEvent(
        id,
        DeveloperEventType.DeveloperSignedUpWithEmail,
        { ...accountData, createdAt: new Date() },
      );
      this.eventEmitter.emit(
        DeveloperEventType.DeveloperSignedUpWithEmail,
        accountData,
      );
      return { id, ...accountData };
    } catch (error: any) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async findAccountByEmail(email: string) {
    return await this.prisma.developerAccount.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { _count: { select: { apps: true, memberships: true } } },
    });
  }

  async findAccountById(id: string) {
    return await this.prisma.developerAccount.findUnique({
      where: { id },
      include: { _count: { select: { apps: true, memberships: true } } },
    });
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
      case DeveloperEventType.DeveloperSignedUpWithEmail:
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
