import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { BaseService } from '../../common/base.service';
import { EventData, ResolvedEvent } from '@eventstore/db-client';
import { DeveloperEventType } from '../../events/developer.events';
import { DeveloperSignupDto } from '../auth/dto/developer-signup.dto';
import {
  DEVELOPER_RESOURCE,
  STREAM_BY_CATEGORY_PREFIX,
} from '../../common/constants';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { OrganizationEventType } from '../../events/organization.events';
import { Organization } from '../organizations/entities/organization.entity';
import { CreateOrganizationMemberDto } from '../organizations/dto/create-organization.dto';

let counter = 0;

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
        { ...accountData, createdAt: new Date(), id },
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
      include: { _count: { select: { clientApps: true, memberships: true } } },
    });
  }

  async findAccountById(id: string) {
    return await this.prisma.developerAccount.findUnique({
      where: { id },
      include: { _count: { select: { clientApps: true, memberships: true } } },
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

          const accountData = await this.prisma.developerAccount.create({
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
          this.eventEmitter.emit(
            DeveloperEventType.DeveloperSignedUpWithEmail,
            { data: accountData, event: event.event },
          );
        }
        break;
      case DeveloperEventType.DeveloperRegisteredOrganization:
        {
          counter += 1;
          this.logger.log(`handler ${counter}`);
          const { accountId, organizationId } =
            eventData as unknown as CreateOrganizationMemberDto;
          const orgMembership = await this.prisma.organizationMember.create({
            data: {
              accountId,
              organizationId,
              role: 'OWNER',
            },
            include: {
              account: true,
              organization: true,
            },
          });

          this.eventEmitter.emit(
            DeveloperEventType.DeveloperRegisteredOrganization,
            { data: orgMembership, event: event.event },
          );
        }
        break;
      default:
        break;
    }
  }

  @OnEvent(OrganizationEventType.OrganizationRegistered)
  async handleOrganizationRegisteredEvent(eventData: {
    data: Organization;
    event: EventData;
  }) {
    this.logger.log(eventData);
    const {
      data: { id: organizationId },
      event: { metadata, id: eventId },
    } = eventData;
    const correlationId = (metadata as any)?.correlationId;
    const developerId = (metadata as any)?.developerId;
    try {
      this.eventStore.appendEvent(
        developerId,
        DeveloperEventType.DeveloperRegisteredOrganization,
        { accountId: developerId, organizationId },
        { correlationId, developerId, causationId: eventId },
      );
    } catch (error: any) {
      this.logger.error(error.message);
    }
  }
}
