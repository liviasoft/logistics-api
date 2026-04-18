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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SettingsService } from './settings.service';
import { defaultSettings } from './settings.config';
import { SettingKey } from './settings.types';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(AuthGuard)
// TODO: Add an AdminGuard here once RBAC is implemented.
// Settings are sensitive — only admins should be able to write them.
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get all settings (merged defaults + DB overrides)' })
  getAll() {
    return this.settings.getAll();
  }

  @Get('keys')
  @Version('1')
  @ApiOperation({ summary: 'List all valid setting keys with their default values' })
  getKeys() {
    return Object.entries(defaultSettings).map(([key, defaultValue]) => ({
      key,
      defaultValue,
      type:        Array.isArray(defaultValue) ? 'array' : typeof defaultValue,
      overridden:  this.settings.isOverridden(key as SettingKey),
      currentValue: this.settings.get(key as SettingKey),
    }));
  }

  @Get(':key')
  @Version('1')
  @ApiOperation({ summary: 'Get a single setting by key' })
  @ApiParam({ name: 'key', example: 'app.maintenanceMode' })
  getOne(@Param('key') key: string) {
    const isValid = key in defaultSettings;
    return {
      key,
      value:      isValid ? this.settings.get(key as SettingKey) : undefined,
      default:    isValid ? defaultSettings[key as SettingKey] : undefined,
      overridden: isValid ? this.settings.isOverridden(key as SettingKey) : false,
      valid:      isValid,
    };
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  @Patch(':key')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a setting value' })
  @ApiParam({ name: 'key', example: 'app.maintenanceMode' })
  async update(
    @Param('key') key: string,
    @Body() body: { value: unknown },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id as string | undefined;
    await this.settings.set(key as SettingKey, body.value as any, userId);
    return { key, value: this.settings.get(key as SettingKey) };
  }

  @Delete(':key')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a setting to its coded default' })
  @ApiParam({ name: 'key', example: 'app.maintenanceMode' })
  async reset(@Param('key') key: string, @Req() req: Request) {
    const userId = (req as any).user?.id as string | undefined;
    await this.settings.reset(key as SettingKey, userId);
    return { key, value: this.settings.get(key as SettingKey), reset: true };
  }

  // ── Cache ─────────────────────────────────────────────────────────────────

  @Patch('_refresh')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reload settings cache from the database (distributed deployments)' })
  async refresh() {
    await this.settings.refresh();
    return { refreshed: true };
  }
}
