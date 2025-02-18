import {
  ConflictException,
  Injectable,
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
import { ObjectId } from 'bson';
import { AllStreamResolvedEvent, ResolvedEvent } from '@eventstore/db-client';

@Injectable()
export class FeatureFlagsService {
  constructor(
    private prisma: PrismaService,
    private eventStore: EventstoreService,
  ) {}

  // Read
  async findAll() {
    return await this.prisma.featureFlag.findMany();
  }

  async findById(id: string) {
    return await this.prisma.featureFlag.findUnique({ where: { id } });
  }

  async findByName(name: string) {
    return await this.prisma.featureFlag.findFirst({
      where: { name: { mode: 'insensitive', equals: name } },
    });
  }

  async searchByScope(nameLike: string) {
    return await this.prisma.featureFlag.findMany({
      where: { name: { startsWith: nameLike, mode: 'insensitive' } },
    });
  }

  // Write
  async create(createFeatureFlagDto: CreateFeatureFlagDto) {
    console.log({ createFeatureFlagDto });
    const existing = await this.prisma.featureFlag.findUnique({
      where: { name: createFeatureFlagDto.name },
    });

    if (existing) {
      throw new ConflictException('Feature Flag already exists');
    }

    try {
      await this.eventStore.appendEvent(
        getFeatureFlagStreamName(),
        FeatureFlagEventType.FeatureFlagRegistered,
        {
          id: this.createId(),
          ...createFeatureFlagDto,
          createdAt: new Date(),
        },
      );
    } catch (error) {
      console.log({ error });
      throw new ServiceUnavailableException('Error connecting to EventStoreDB');
    }
    return 'This action adds a new featureFlag';
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
    } catch (error: any) {
      console.log(error);
    }
    return `This action updates a #${id} featureFlag`;
  }

  async toggle(id: string) {
    const ff = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!ff) throw new NotFoundException('Feature Flag not found');
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
    return `${id} toggled : ${!ff.enabled} `;
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
    } catch (error: any) {
      console.log(error);
    }
    return `This action removes a #${id} featureFlag`;
  }

  // Utils
  createId() {
    return `feature_flag-${new ObjectId().toString()}`;
  }

  // Events
  async subscribeToEvents() {
    console.log('Event Fired');
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
      console.log({ error });
    }
  }

  handleAllStoredEvents(event: AllStreamResolvedEvent) {
    console.log({ event });
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
          const { name, description, enabled, id } =
            eventData as unknown as CreateFeatureFlagDto;

          await this.prisma.featureFlag.create({
            data: {
              createdAt: created,
              name,
              description,
              enabled,
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
