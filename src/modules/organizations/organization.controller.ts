import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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

@UseGuards(AuthGuard, RolesGuard)
@Roles(RolesList.DEVELOPER)
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
  findMyOrganizations() {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    const filters = this.asyncStorageService.get<boolean>(RolesList.SUPER_ADMIN)
      ? {}
      : { members: { some: { accountId: developerId } } };
    return this.organizationService.getOrganizationsPaginated({ filters });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(+id, updateOrganizationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationService.remove(+id);
  }
}
