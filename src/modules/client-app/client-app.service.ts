import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateClientAppDto } from './dto/create-client-app.dto';
import { UpdateClientAppDto } from './dto/update-client-app.dto';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import {
  CLIENT_APP_RESOURCE,
  STREAM_BY_CATEGORY_PREFIX,
} from '../../common/constants';
import { ClientAppEventType } from '../../events/clientApp.events';
import { ResolvedEvent } from '@eventstore/db-client';

@Injectable()
export class ClientAppService extends BaseService {
  private readonly logger = new Logger(ClientAppService.name, {
    timestamp: true,
  });
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventstoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }
  async registerClientApp(
    clientAppData: CreateClientAppDto,
    developerId: string,
  ) {
    console.log({ clientAppData });
    const { organizationId } = clientAppData;
    const id = this.createResourceId(CLIENT_APP_RESOURCE);
    try {
      await this.eventStore.appendEvent(
        id,
        ClientAppEventType.ClientAppRegistered,
        { id, ...clientAppData, createdAt: new Date(), developerId },
        { correlationId: id, organizationId, developerId },
      );
      return this.formatResponse({
        message: 'New Client App Registered',
        data: { id, ...clientAppData },
        statusCode: HttpStatus.CREATED,
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  // Events
  async subscribeToEvents() {
    this.logger.log(
      `Subscribed to ${STREAM_BY_CATEGORY_PREFIX}-${CLIENT_APP_RESOURCE} events`,
    );
    try {
      const subscription = await this.eventStore.subscribeToStream(
        `${STREAM_BY_CATEGORY_PREFIX}-${CLIENT_APP_RESOURCE}`,
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
      case ClientAppEventType.ClientAppRegistered:
        {
          const { name, id, organizationId, developerId } =
            eventData as unknown as CreateClientAppDto;
          const clientId = '1234';
          const clientSecret = '1234';
          const clientAppData = await this.prisma.clientApp.create({
            data: {
              createdAt,
              name,
              organizationId,
              developerId,
              clientId,
              clientSecret,
              id,
              revision: Number(revision.toString()),
              lastEventId,
              lastEventType,
              lastStreamId,
            },
            include: {
              _count: {
                select: {
                  customers: true,
                  featureFlags: true,
                  orders: true,
                  packages: true,
                },
              },
            },
          });
          this.eventEmitter.emit(ClientAppEventType.ClientAppRegistered, {
            data: clientAppData,
            event: event.event,
          });
        }
        break;
      default:
        break;
    }
  }
  findAll() {
    return `This action returns all clientApp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clientApp`;
  }

  update(id: number, updateClientAppDto: UpdateClientAppDto) {
    console.log({ updateClientAppDto });
    return `This action updates a #${id} clientApp`;
  }

  remove(id: number) {
    return `This action removes a #${id} clientApp`;
  }
}
