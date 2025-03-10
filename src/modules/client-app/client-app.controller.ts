import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ClientAppService } from './client-app.service';
import { CreateClientAppDto } from './dto/create-client-app.dto';
import { UpdateClientAppDto } from './dto/update-client-app.dto';
import { FeatureFlags } from '../feature-flags/feature-flags.decorator';
import { DEVELOPER_RESOURCE, FeatureFlagsList } from '../../common/constants';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { ClientAppInterceptor } from './client-app.interceptor';
import { RolesGuard } from '../roles/roles.guard';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesList } from '../../common/constants/roles-list.constants';
import { OrganizationService } from '../organizations/organization.service';

@Controller({ path: 'apps', version: '1' })
@UseInterceptors(ClientAppInterceptor)
export class ClientAppController {
  constructor(
    private readonly clientAppService: ClientAppService,
    private readonly organizationService: OrganizationService,
    private readonly asyncStorageService: AsyncStorageService,
  ) {}

  @Post('/register')
  @FeatureFlags(FeatureFlagsList.REGISTER_CLIENT_APP)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RolesList.DEVELOPER)
  async create(@Body() createClientAppDto: CreateClientAppDto) {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    // TODO: check if developer belongs to organization
    // TODO: check if developer has appropriate permissions / role in org
    // TODO: Set app creation limits
    const isSuperAdmin = this.asyncStorageService.get<boolean>(
      RolesList.SUPER_ADMIN,
    );
    if (!isSuperAdmin) {
      const membership =
        await this.organizationService.findOrganizationMembership(
          createClientAppDto.organizationId,
          developerId,
        );
      if (!membership || membership?.role !== 'OWNER')
        throw new UnauthorizedException();
    }
    if (!developerId) return false;
    return this.clientAppService.registerClientApp(
      createClientAppDto,
      isSuperAdmin ? createClientAppDto.developerId : developerId,
    );
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  findAll(@Req() req: Request) {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    const isSuperAdmin = this.asyncStorageService.get<boolean>(
      RolesList.SUPER_ADMIN,
    );
    const { filters, ...rest } = this.clientAppService.formatQueryParams(
      req.query,
    );
    console.log({ filters, ...rest });
    if (!isSuperAdmin) filters.developerId = developerId;
    return this.clientAppService.getClientAppsPaginated({ filters, ...rest });
  }

  @Get(':clientAppId')
  findOne(@Param('clientAppId') id: string) {
    return this.clientAppService.findOne(+id);
  }

  @Patch(':clientAppId')
  update(
    @Param('clientAppId') id: string,
    @Body() updateClientAppDto: UpdateClientAppDto,
  ) {
    return this.clientAppService.update(+id, updateClientAppDto);
  }

  @Delete(':clientAppId')
  remove(@Param('clientAppId') id: string) {
    return this.clientAppService.remove(+id);
  }
}
