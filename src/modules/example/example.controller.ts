/**
 * Example Controller
 *
 * REST endpoints that demonstrate how to invoke the template's features.
 * Delete this module (or keep it as-is) when building your real domain.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ExampleService } from './example.service';

@ApiTags('Example')
@Controller('example')
@UseGuards(AuthGuard)
export class ExampleController {
  constructor(private readonly example: ExampleService) {}

  // ── Settings ──────────────────────────────────────────────────────────────

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Read app status from settings' })
  getStatus() {
    return this.example.getAppStatus();
  }

  // ── Events + WebSocket ────────────────────────────────────────────────────

  @Post('events/user-created')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emit user.created event + WebSocket broadcast' })
  async triggerUserCreated(
    @Body() body: { userId: string; email: string },
  ) {
    return this.example.triggerUserCreatedEvent(body.userId, body.email);
  }

  @Post('broadcast')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Broadcast a message to all WebSocket clients' })
  broadcast(@Body() body: { message: string }) {
    return this.example.broadcastAnnouncement(body.message);
  }

  // ── Background Jobs ───────────────────────────────────────────────────────

  @Post('jobs/welcome/:userId')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enqueue an immediate welcome job for a user' })
  enqueueWelcome(@Param('userId') userId: string) {
    return this.example.enqueueWelcomeJob(userId);
  }

  @Post('jobs/delayed')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enqueue a delayed background job' })
  enqueueDelayed(@Body() body: { userId: string; delayMs: number }) {
    return this.example.enqueueDelayedJob(body.userId, body.delayMs);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  @Post('notify/welcome')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a welcome email via the active notification provider' })
  sendWelcomeEmail(
    @Body() body: { email: string; name: string },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id as string;
    return this.example.sendWelcomeEmail(userId, body.email, body.name);
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  @Post('upload/avatar')
  @Version('1')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a profile picture' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id as string;
    return this.example.uploadProfilePicture(userId, file);
  }

  // ── Redis ─────────────────────────────────────────────────────────────────

  @Post('cache/:userId')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cache a user profile object in Redis (5-minute TTL)' })
  cacheProfile(
    @Param('userId') userId: string,
    @Body() profile: object,
  ) {
    return this.example.cacheUserProfile(userId, profile);
  }

  @Get('cache/:userId')
  @Version('1')
  @ApiOperation({ summary: 'Retrieve a cached user profile from Redis' })
  getCachedProfile(@Param('userId') userId: string) {
    return this.example.getCachedProfile(userId);
  }

  // ── Cron management ───────────────────────────────────────────────────────

  @Get('crons')
  @Version('1')
  @ApiOperation({ summary: 'List all registered cron jobs and their next fire time' })
  listCrons() {
    return this.example.listScheduledJobs();
  }

  @Post('crons/:userId')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule a dynamic recurring cron job for a user' })
  scheduleCron(
    @Param('userId') userId: string,
    @Body() body: { expression: string },
  ) {
    return this.example.scheduleUserReport(userId, body.expression);
  }

  @Delete('crons/:userId')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a dynamic cron job for a user' })
  cancelCron(@Param('userId') userId: string) {
    return this.example.cancelUserReport(userId);
  }
}
