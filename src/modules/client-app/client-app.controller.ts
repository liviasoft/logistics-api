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
} from '@nestjs/common';
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

@Controller({ path: 'apps', version: '1' })
@UseInterceptors(ClientAppInterceptor)
export class ClientAppController {
  constructor(
    private readonly clientAppService: ClientAppService,
    private readonly asyncStorageService: AsyncStorageService,
  ) {}

  @Post('/register')
  @FeatureFlags(FeatureFlagsList.REGISTER_CLIENT_APP)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RolesList.DEVELOPER)
  create(@Body() createClientAppDto: CreateClientAppDto) {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    // TODO: check if developer belongs to organization
    // TODO: check if developer has appropriate permissions / role in org
    if (!developerId) return false;
    return this.clientAppService.registerClientApp(
      createClientAppDto,
      developerId,
    );
  }

  @Get()
  findAll() {
    return this.clientAppService.getClientAppsPaginated({});
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
