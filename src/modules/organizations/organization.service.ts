import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ORGANIZATION_RESOURCE,
  STREAM_BY_CATEGORY_PREFIX,
} from '../../common/constants';
import { ResolvedEvent } from '@eventstore/db-client';
import { OrganizationEventType } from '../../events/organization.events';
import { OrgType } from '@prisma/client';

@Injectable()
export class OrganizationService extends BaseService {
  private readonly logger = new Logger(OrganizationService.name, {
    timestamp: true,
  });
  constructor(
    private prisma: PrismaService,
    private eventStore: EventstoreService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  // Events
  async subscribeToEvents() {
    this.logger.log(
      `Subscribed to ${STREAM_BY_CATEGORY_PREFIX}-${ORGANIZATION_RESOURCE} events`,
    );
    try {
      const subscription = await this.eventStore.subscribeToStream(
        `${STREAM_BY_CATEGORY_PREFIX}-${ORGANIZATION_RESOURCE}`,
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
      created: createdAt,
      data: eventData,
      revision,
      type: lastEventType,
      id: lastEventId,
      streamId: lastStreamId,
    } = event.event;
    switch (lastEventType) {
      case OrganizationEventType.OrganizationRegistered:
        {
          const { name, type, id } =
            eventData as unknown as CreateOrganizationDto;

          const organizationData = await this.prisma.organization.create({
            data: {
              createdAt,
              name,
              type: type as OrgType,
              id,
              revision: Number(revision.toString()),
              lastEventId,
              lastEventType,
              lastStreamId,
            },
            include: {
              _count: {
                select: {
                  clientApps: true,
                  members: true,
                },
              },
            },
          });
          this.eventEmitter.emit(OrganizationEventType.OrganizationRegistered, {
            data: organizationData,
            event: event.event,
          });
        }
        break;
      default:
        break;
    }
  }
  async createOrganization(
    organizationData: CreateOrganizationDto,
    developerId: string,
  ) {
    const id = this.createResourceId(ORGANIZATION_RESOURCE);
    try {
      await this.eventStore.appendEvent(
        id,
        OrganizationEventType.OrganizationRegistered,
        { ...organizationData, createdAt: new Date() },
        { correlationId: id, developerId },
      );
      this.eventEmitter.emit(OrganizationEventType.OrganizationRegistered, {
        organizationData,
        developerId,
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
    return 'This action adds a new organization';
  }

  findAll() {
    return `This action returns all organization`;
  }

  findOne(id: number) {
    return `This action returns a #${id} organization`;
  }

  update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    console.log({ updateOrganizationDto });
    return `This action updates a #${id} organization`;
  }

  remove(id: number) {
    return `This action removes a #${id} organization`;
  }
}
