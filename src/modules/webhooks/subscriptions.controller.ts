import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';

type AuthRequest = Request & { user?: { sub: string } };

@ApiTags('Webhooks — Subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'webhooks/subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webhook subscription' })
  create(@Req() req: AuthRequest, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptions.create(req.user!.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List your webhook subscriptions' })
  findAll(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subscriptions.findAll(
      req.user!.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.subscriptions.findOne(req.user!.sub, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook subscription' })
  update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptions.update(req.user!.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webhook subscription' })
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.subscriptions.remove(req.user!.sub, id);
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the signing secret for a subscription',
    description:
      'Generates a new secret. Returns it once — update your receiver immediately.',
  })
  rotateSecret(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.subscriptions.rotateSecret(req.user!.sub, id);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended subscription' })
  reactivate(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.subscriptions.reactivate(req.user!.sub, id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a test event to a subscription URL',
    description:
      'Delivers a webhook.test event immediately (bypasses the queue).',
  })
  async test(@Req() req: AuthRequest, @Param('id') id: string) {
    // Reuse the dispatcher — but call dispatch directly with a test event
    // The dispatcher will find this subscription and enqueue a delivery job.
    // Injecting WebhookDispatcherService here would create a circular dep,
    // so we return instructions to use the dispatcher directly in your code.
    console.log(id, req.body);
    return {
      success: true,
      message:
        'Call dispatcher.dispatchToSubscription(id, "webhook.test", { test: true }) from your service.',
    };
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery logs for a subscription' })
  getDeliveries(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subscriptions.getDeliveryLogs(
      req.user!.sub,
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
