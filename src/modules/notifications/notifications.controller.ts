import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Send a notification ad-hoc (useful for testing / admin tooling).
   * In production, notifications are typically sent programmatically from service layer.
   */
  @Post()
  @Version('1')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a notification via the active provider' })
  async send(@Body() dto: SendNotificationDto, @Req() req: Request) {
    const userId = (req as any).user?.id as string | undefined;
    return this.notifications.send(dto, userId);
  }

  @Get()
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "List the authenticated user's notification history" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const userId = (req as any).user.id as string;
    return this.notifications.listNotifications(userId, +page, +limit);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a single notification record' })
  async getOne(@Param('id') id: string) {
    return this.notifications.getNotification(id);
  }
}
