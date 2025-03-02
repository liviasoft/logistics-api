import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClientAppService } from './client-app.service';
import { CreateClientAppDto } from './dto/create-client-app.dto';
import { UpdateClientAppDto } from './dto/update-client-app.dto';
import { FeatureFlags } from '../feature-flags/feature-flags.decorator';
import { DEVELOPER_RESOURCE, FeatureFlagsList } from '../../common/constants';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';

@Controller({ path: 'apps', version: '1' })
export class ClientAppController {
  constructor(
    private readonly clientAppService: ClientAppService,
    private readonly asyncStorageService: AsyncStorageService,
  ) {}

  @Post('/register')
  @FeatureFlags(FeatureFlagsList.REGISTER_CLIENT_APP)
  create(@Body() createClientAppDto: CreateClientAppDto) {
    const developerId = this.asyncStorageService.get<string>(
      `${DEVELOPER_RESOURCE}Id`,
    );
    // TODO: check if developer belongs to organization
    // TODO: check if developer has appropriate permissions / role in org
    return this.clientAppService.registerClientApp(
      createClientAppDto,
      developerId,
    );
  }

  @Get()
  findAll() {
    return this.clientAppService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientAppService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClientAppDto: UpdateClientAppDto,
  ) {
    return this.clientAppService.update(+id, updateClientAppDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientAppService.remove(+id);
  }
}
