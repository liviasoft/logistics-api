import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { UserPreferencesService } from './user-preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UserPreferenceKey } from './user-preferences.config';

@ApiTags('User Preferences')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users/me/preferences')
export class UserPreferencesController {
  constructor(private readonly preferences: UserPreferencesService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get all preferences for the authenticated user' })
  async getAll(@Req() req: Request) {
    return this.preferences.getAll((req as any).user.id);
  }

  @Patch()
  @Version('1')
  @ApiOperation({ summary: 'Update one or more preferences' })
  async patch(@Req() req: Request, @Body() dto: UpdatePreferencesDto) {
    return this.preferences.patch((req as any).user.id, dto);
  }

  @Delete('reset')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset all preferences to defaults' })
  async resetAll(@Req() req: Request) {
    return this.preferences.resetAll((req as any).user.id);
  }

  @Delete(':key')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a single preference to its default' })
  async resetOne(@Req() req: Request, @Param('key') key: string) {
    return this.preferences.reset((req as any).user.id, key as UserPreferenceKey);
  }
}
