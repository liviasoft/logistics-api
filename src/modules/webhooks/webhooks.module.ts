import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QUEUE_NAMES } from '../../common/queues/queues.constants';
import { InboundWebhooksController } from './inbound-webhooks.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { WebhookDispatcherService } from './dispatcher.service';
import { InboundWebhookProcessor } from './processors/inbound-webhook.processor';
import { DeliveryProcessor } from './processors/delivery.processor';
import { StripeSignatureGuard } from './guards/stripe-signature.guard';

@Module({
  imports: [
    // Register webhook queues (BullModule.forRoot connection set up in QueuesModule)
    BullModule.registerQueue(
      { name: QUEUE_NAMES.WEBHOOK_INBOUND },
      { name: QUEUE_NAMES.WEBHOOK_DELIVERY },
    ),

    // Add queues to Bull Board dashboard automatically
    BullBoardModule.forFeature(
      { name: QUEUE_NAMES.WEBHOOK_INBOUND, adapter: BullMQAdapter },
      { name: QUEUE_NAMES.WEBHOOK_DELIVERY, adapter: BullMQAdapter },
    ),
  ],
  controllers: [InboundWebhooksController, SubscriptionsController],
  providers: [
    SubscriptionsService,
    WebhookDispatcherService,
    InboundWebhookProcessor,
    DeliveryProcessor,
    StripeSignatureGuard,
  ],
  exports: [WebhookDispatcherService, SubscriptionsService],
})
export class WebhooksModule {}
