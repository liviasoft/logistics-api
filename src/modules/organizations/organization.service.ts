import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
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
import { OrgRole, OrgType, Prisma } from '@prisma/client';
import {
  OrganizationFiltersPaginated,
  OrganizationMemberFiltersPaginated,
} from './types/organization.types';
import { ParsedQs } from 'qs';

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

  async createOrganization(
    organizationData: CreateOrganizationDto,
    developerId: string,
  ) {
    if (await this.findOrganizationByName(organizationData.name)) {
      throw new BadRequestException('Organization name is not available');
    }
    const id = this.createResourceId(ORGANIZATION_RESOURCE);
    try {
      await this.eventStore.appendEvent(
        id,
        OrganizationEventType.OrganizationRegistered,
        { ...organizationData, createdAt: new Date(), id },
        { correlationId: id, developerId },
      );
      return this.formatResponse({
        message: 'New Organization registered',
        data: { id, ...organizationData },
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

  async findAll() {
    return await this.prisma.organization.findMany();
  }

  async findOrganizationsByMembership(developerId: string) {
    return this.formatResponse({
      data: await this.prisma.organization.findMany({
        where: {
          members: {
            some: {
              accountId: developerId,
            },
          },
        },
        include: {
          _count: { select: { clientApps: true, members: true } },
          members: {
            include: {
              account: { select: { id: true, email: true, name: true } },
            },
          },
          clientApps: true,
        },
      }),
      message: 'Your organizations',
      statusCode: HttpStatus.OK,
    });
  }

  async findOrganizationById(id: string) {
    return await this.prisma.organization.findUnique({
      where: { id },
      include: { _count: true },
    });
  }

  async getOrganizationDetails(organizationId: string) {
    return this.formatResponse({
      data: await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: true,
          clientApps: {
            omit: {
              clientId: true,
              clientSecret: true,
            },
          },
          members: {
            include: {
              account: {
                omit: {
                  password: true,
                },
              },
            },
          },
        },
      }),
      message: 'Organization Details',
    });
  }

  async findOrganizationByName(name: string) {
    return await this.prisma.organization.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      include: { _count: true },
    });
  }

  async findOrganizationMembership(organizationId: string, accountId: string) {
    return await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_accountId: {
          organizationId,
          accountId,
        },
      },
      include: {
        account: {
          omit: { password: true },
        },
        organization: true,
      },
    });
  }

  async getOrganizationsPaginated({
    page = 1,
    limit = this.defaultPaginationLimit,
    filters,
    orderBy = { createdAt: 'desc' },
    includes,
  }: OrganizationFiltersPaginated) {
    const [organizations, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        take: limit,
        skip: (page - 1) * limit,
        where: { ...filters },
        orderBy,
        include: this.getIncludes(includes),
      }),
      this.prisma.organization.count({ where: { ...filters } }),
    ]);
    const { pages, prev, next } = this.paginate(total, limit, page);
    return this.formatResponse({
      data: {
        data: organizations,
        total,
        pages,
        prev,
        next,
        meta: { filters, orderBy, includes, page, limit },
      },
    });
  }

  async getOrganizationMembersPaginated(
    organizationId: string,
    {
      page = 1,
      limit = this.defaultPaginationLimit,
      filters,
      orderBy = { joinedAt: 'desc' },
      includes,
    }: OrganizationMemberFiltersPaginated,
  ) {
    const [orgMembers, total] = await this.prisma.$transaction([
      this.prisma.organizationMember.findMany({
        take: limit,
        skip: (page - 1) * limit,
        where: { organizationId, ...filters },
        orderBy,
        include: { ...includes },
      }),
      this.prisma.organizationMember.count({
        where: { organizationId, ...filters },
      }),
    ]);
    const { pages, prev, next } = this.paginate(total, limit, page);
    console.log({ orgMembers, total, pages, prev, next });
    return this.formatResponse({
      data: {
        data: orgMembers,
        total,
        pages,
        prev,
        next,
        meta: { filters, orderBy, includes, page, limit },
      },
    });
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

  formatQueryParams(query: ParsedQs) {
    const filters: Prisma.OrganizationWhereInput = {};
    const includes: Prisma.OrganizationInclude = {};
    const orderBy: Prisma.OrganizationOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    const OR: { [key: string]: any }[] = [];
    const AND: { [key: string]: any }[] = [];
    const limit =
      parseInt(query.limit as string) || this.defaultPaginationLimit;
    const page = parseInt(query.page as string) || 1;
    for (const key in query) {
      if (key === 'q') {
        OR.push({
          name: { contains: query[key] as string, mode: 'insensitive' },
        });
      }
      if (key === 'type') {
        if ((query[key] as unknown as string) in OrgType) {
          AND.push({ [key]: query[key] as OrgType });
        }
      }
    }
    if (AND.length) filters.AND = AND;
    if (OR.length) filters.OR = OR;
    return { filters, includes, orderBy, page, limit };
  }

  formatMemberQueryParams(query: ParsedQs) {
    const filters: Prisma.OrganizationMemberWhereInput = {};
    const includes: Prisma.OrganizationMemberInclude = {};
    const orderBy: Prisma.OrganizationMemberOrderByWithRelationInput = {
      joinedAt: 'desc',
    };
    const OR: { [key: string]: any }[] = [];
    const AND: { [key: string]: any }[] = [];
    const limit =
      parseInt(query.limit as string) || this.defaultPaginationLimit;
    const page = parseInt(query.page as string) || 1;
    for (const key in query) {
      if (key === 'q') {
        OR.push({
          name: { contains: query[key] as string, mode: 'insensitive' },
        });
      }
      if (key === 'role') {
        if ((query[key] as unknown as string) in OrgRole) {
          AND.push({ [key]: query[key] as OrgRole });
        }
      }
      if (key === 'include') {
        const includeItems = (query[key] as string).split(',');
        includeItems.forEach((item) => {
          if (item === 'organization') includes.organization = true;
          if (item === 'developer') includes.account = true;
        });
      }
    }
    if (AND.length) filters.AND = AND;
    if (OR.length) filters.OR = OR;
    return { filters, includes, orderBy, page, limit };
  }

  getIncludes(includes?: Prisma.OrganizationInclude) {
    const countIncludes: Prisma.OrganizationInclude = { _count: true };
    return { ...countIncludes, ...includes };
  }
}
