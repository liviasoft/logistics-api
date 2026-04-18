import { Module } from '@nestjs/common';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { UserRegisteredSubscriber } from './user-registered.subscriber';
import { PaymentSubscriber } from './payment-succeeded.subscriber';
import { SettingUpdatedSubscriber } from './setting-updated.subscriber';

/**
 * SubscribersModule
 *
 * Registers all event subscriber classes as NestJS providers.
 * NestJS instantiates them on startup and EventEmitter2 wires up
 * the @OnEvent() decorators automatically.
 *
 * To add a subscriber:
 *   1. Create src/subscribers/my-event.subscriber.ts
 *   2. Add it to the providers array below
 *   3. Import any modules whose services it needs
 */
@Module({
  imports: [
    NotificationsModule,  // for UserRegisteredSubscriber
  ],
  providers: [
    UserRegisteredSubscriber,
    PaymentSubscriber,
    SettingUpdatedSubscriber,
    // Add your subscribers here:
    // OrderPlacedSubscriber,
    // InvoiceCreatedSubscriber,
  ],
})
export class SubscribersModule {}
