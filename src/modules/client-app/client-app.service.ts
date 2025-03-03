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
import { ClientAppFiltersPaginated } from './types/client-app.types';
import { Prisma } from '@prisma/client';
import { generateRandomString } from '../../common/utils/helper-functions.utils';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClientAppService extends BaseService {
  private readonly logger = new Logger(ClientAppService.name, {
    timestamp: true,
  });
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStore: EventstoreService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
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
          const clientId = `${this.configService.get('ENVIRONMENT')}_${generateRandomString(20, { uppercaseOnly: true })}`;
          const clientSecret = `${this.configService.get('ENVIRONMENT')}_${generateRandomString(38, { alphanumeric: true })}`;
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

  async getClientAppsPaginated({
    page = 1,
    limit = this.defaultPaginationLimit,
    filters = {},
    orderBy = {},
    includes = {},
  }: ClientAppFiltersPaginated) {
    const [clientApps, total] = await this.prisma.$transaction([
      this.prisma.clientApp.findMany({
        take: limit,
        skip: (page - 1) * limit,
        where: { ...filters },
        orderBy,
        include: this.getIncludes(includes),
      }),
      this.prisma.clientApp.count({
        where: {
          ...filters,
        },
      }),
    ]);
    const { pages, prev, next } = this.paginate(total, limit, page);
    return this.formatResponse({
      data: {
        data: clientApps,
        total,
        pages,
        prev,
        next,
        meta: { filters, orderBy, includes, page, limit },
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} clientApp`;
  }

  async findClientAppById(id: string) {
    return await this.prisma.clientApp.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            featureFlags: true,
            orders: true,
            packages: true,
          },
        },
        developer: true,
        organization: true,
      },
    });
  }

  update(id: number, updateClientAppDto: UpdateClientAppDto) {
    console.log({ updateClientAppDto });
    return `This action updates a #${id} clientApp`;
  }

  remove(id: number) {
    return `This action removes a #${id} clientApp`;
  }

  getIncludes(includes?: Prisma.ClientAppInclude) {
    const countIncludes: Prisma.ClientAppInclude = {
      _count: {
        select: {
          customers: true,
          featureFlags: true,
          orders: true,
          packages: true,
        },
      },
    };
    return { ...countIncludes, ...includes };
  }
}
