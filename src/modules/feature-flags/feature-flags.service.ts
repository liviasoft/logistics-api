import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import {
  FeatureFlagEventType,
  getFeatureFlagStreamName,
} from '../../events/featureFlag.events';
import { AllStreamResolvedEvent, ResolvedEvent } from '@eventstore/db-client';
import { BaseService } from '../../common/base.service';
import { FEATURE_FLAG_RESOURCE } from '../../common/constants';

@Injectable()
export class FeatureFlagsService extends BaseService {
  private readonly logger = new Logger(FeatureFlagsService.name, {
    timestamp: true,
  });
  constructor(
    private prisma: PrismaService,
    private eventStore: EventstoreService,
  ) {
    super();
  }

  // Read
  async findAll() {
    return this.formatResponse({
      data: await this.prisma.featureFlag.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    });
  }

  async findFeatureFlagById(id: string) {
    return this.prisma.featureFlag.findUnique({ where: { id } });
  }

  async findById(id: string) {
    return this.formatResponse({
      data: await this.prisma.featureFlag.findUnique({ where: { id } }),
    });
  }

  async findByName(name: string) {
    return this.formatResponse({
      data: await this.prisma.featureFlag.findFirst({
        where: { name: { mode: 'insensitive', equals: name } },
      }),
    });
  }

  async searchByScope(nameLike: string) {
    return await this.prisma.featureFlag.findMany({
      where: { name: { startsWith: nameLike, mode: 'insensitive' } },
    });
  }

  // Write
  async create(createFeatureFlagDto: CreateFeatureFlagDto) {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { name: createFeatureFlagDto.name },
    });

    if (existing) {
      throw new ConflictException('Feature Flag already exists');
    }

    try {
      const id = this.createResourceId(FEATURE_FLAG_RESOURCE);
      await this.eventStore.appendEvent(
        getFeatureFlagStreamName(),
        FeatureFlagEventType.FeatureFlagRegistered,
        {
          id,
          ...createFeatureFlagDto,
          createdAt: new Date(),
        },
      );
      return this.formatResponse({
        data: { id, ...createFeatureFlagDto },
        message: 'Feature Flag Registered',
      });
    } catch (error) {
      this.logger.error(error);
      throw new ServiceUnavailableException('Error connecting to EventStoreDB');
    }
  }

  async update(id: string, data: UpdateFeatureFlagDto) {
    const ff = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!ff) throw new NotFoundException('Feature Flag not found');
    try {
      await this.eventStore.appendEvent(
        getFeatureFlagStreamName(),
        FeatureFlagEventType.FeatureFlagEdited,
        { id, ...data, updatedAt: new Date() },
      );
      return this.formatResponse({
        data: { id, ...ff, updatedAt: new Date() },
        message: 'Feature Flag updated',
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new ServiceUnavailableException('Error updating Feature Flag');
    }
  }

  async toggle(id: string) {
    const ff = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!ff) throw new NotFoundException('Feature Flag not found');
    try {
      await this.eventStore.appendEvent(
        getFeatureFlagStreamName(),
        ff.enabled
          ? FeatureFlagEventType.FeatureFlagDisabled
          : FeatureFlagEventType.FeatureFlagEnabled,
        {
          id,
          enabled: !ff.enabled,
          updatedAt: new Date(),
        },
      );
      return this.formatResponse({
        data: { ...ff, id, enabled: !ff.enabled },
        message: 'Feature Flag Toggled',
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new ServiceUnavailableException('Error toggling feature flag');
    }
  }

  async remove(id: string) {
    const ff = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!ff) throw new NotFoundException('Feature Flag not found');
    try {
      await this.eventStore.appendEvent(
        getFeatureFlagStreamName(),
        FeatureFlagEventType.FeatureFlagEdited,
        { id },
      );
      return this.formatResponse({
        data: { ...ff, id },
        message: 'Feature flag removed',
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new ServiceUnavailableException('Error deleting feature flag');
    }
  }

  // Events
  async subscribeToEvents() {
    this.logger.log(`Subscribed to ${getFeatureFlagStreamName()} events`);
    try {
      const subscription = await this.eventStore.subscribeToStream(
        getFeatureFlagStreamName(),
        {
          fromRevision: 'end',
        },
      );
      for await (const resolvedEvent of subscription) {
        this.handleStreamEvents(resolvedEvent);
      }
    } catch (error: any) {
      this.logger.error(error);
    }
  }

  handleAllStoredEvents(event: AllStreamResolvedEvent) {
    this.logger.log({ event });
    return;
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
      case FeatureFlagEventType.FeatureFlagRegistered:
        {
          const { name, description, enabled, id, errorMessage } =
            eventData as unknown as CreateFeatureFlagDto;

          await this.prisma.featureFlag.create({
            data: {
              createdAt: created,
              name,
              description,
              enabled,
              errorMessage,
              id,
              revision: Number(revision.toString()),
              lastEventId,
              lastEventType,
              lastStreamId,
            },
          });
        }
        break;
      case FeatureFlagEventType.FeatureFlagDisabled:
      case FeatureFlagEventType.FeatureFlagEnabled:
        {
          const { enabled, id } = eventData as unknown as {
            id: string;
            enabled: boolean;
          };
          await this.prisma.featureFlag.update({
            where: {
              id,
            },
            data: {
              enabled,
              revision: Number(revision.toString()),
              lastEventId,
              lastEventType,
              lastStreamId,
            },
          });
        }
        break;
      case FeatureFlagEventType.FeatureFlagEdited:
        {
          const { id, ...data } =
            eventData as unknown as UpdateFeatureFlagDto & {
              id: string;
            };
          await this.prisma.featureFlag.update({
            where: { id },
            data: {
              ...data,
              revision: Number(revision.toString()),
              lastEventId,
              lastEventType,
              lastStreamId,
            },
          });
        }
        break;
      case FeatureFlagEventType.FeatureFlagRemoved:
        {
          const { id } = eventData as { id: string };
          await this.prisma.featureFlag.delete({ where: { id } });
        }
        break;
      default:
        break;
    }
  }

  async readAllEvents() {
    const rawEvents = await this.eventStore.readStream(
      getFeatureFlagStreamName(),
    );
    const events: any[] = [];
    for await (const resolvedEvent of rawEvents) {
      const {
        data,
        created,
        id,
        metadata,
        revision,
        type,
        position,
        streamId,
        isJson,
      } = resolvedEvent.event;
      events.push({
        data,
        created,
        id,
        streamId,
        isJson,
        metadata,
        revision: revision.toString(),
        type,
        position: {
          commit: position.commit.toString(),
          prepare: position.prepare.toString(),
        },
      });
    }
    return events;
  }
}
