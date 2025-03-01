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
import { FeatureFlagsList } from '../../common/constants';

@Controller({ path: 'apps', version: '1' })
export class ClientAppController {
  constructor(private readonly clientAppService: ClientAppService) {}

  @Post()
  @FeatureFlags(FeatureFlagsList.REGISTER_CLIENT_APP)
  create(@Body() createClientAppDto: CreateClientAppDto) {
    return this.clientAppService.create(createClientAppDto);
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
