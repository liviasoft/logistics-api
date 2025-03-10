import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { FeatureFlags } from '../feature-flags/feature-flags.decorator';
import { DEVELOPER_RESOURCE, FeatureFlagsList } from '../../common/constants';
import { AuthGuard } from '../auth/auth.guard';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { Roles } from '../roles/roles.decorator';
import { RolesList } from '../../common/constants/roles-list.constants';
import { RolesGuard } from '../roles/roles.guard';
import { Request, Response } from 'express';
import { OrganizationsInterceptor } from './organizations.interceptor';

@UseGuards(AuthGuard, RolesGuard)
@Roles(RolesList.DEVELOPER)
@UseInterceptors(OrganizationsInterceptor)
@Controller({ path: 'organizations', version: '1' })
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly asyncStorageService: AsyncStorageService,
  ) {}

  @Post('/register')
  @FeatureFlags(FeatureFlagsList.REGISTER_ORGANIZATION)
  async registerOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
  ) {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    return this.organizationService.createOrganization(
      createOrganizationDto,
      developerId,
    );
  }

  @Get()
  findMyOrganizations(@Req() req: Request) {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    const filters = this.asyncStorageService.get<boolean>(RolesList.SUPER_ADMIN)
      ? {}
      : { members: { some: { accountId: developerId } } };
    const { filters: queryFilters, ...rest } =
      this.organizationService.formatQueryParams(req.query);
    return this.organizationService.getOrganizationsPaginated({
      filters: { ...queryFilters, ...filters },
      ...rest,
    });
  }

  @Get(':organizationId')
  findOne(@Param('organizationId') organizationId: string) {
    return this.organizationService.getOrganizationDetails(organizationId);
  }

  @Get(':organizationId/members')
  async getOrganizationMembers(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    const isSuperAdmin = this.asyncStorageService.get<boolean>(
      RolesList.SUPER_ADMIN,
    );
    const organizationId = res.locals.organization?.id;
    const membership =
      await this.organizationService.findOrganizationMembership(
        organizationId,
        developerId,
      );
    if (!isSuperAdmin && !membership) {
      return new UnauthorizedException();
    }
    console.log({ isSuperAdmin, membership, organizationId });
    const { filters, ...rest } =
      this.organizationService.formatMemberQueryParams(req.query);
    console.log({ filters, rest });
    return this.organizationService.getOrganizationMembersPaginated(
      organizationId,
      { filters, ...rest },
    );
  }

  @Patch(':organizationId')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(+id, updateOrganizationDto);
  }

  @Delete(':organizationId')
  remove(@Param('id') id: string) {
    return this.organizationService.remove(+id);
  }
}
