import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppEvents } from '../events/app-events';
import { SettingUpdatedEvent, SettingResetEvent } from '../events/event-payloads';

/**
 * Reacts to settings change events.
 *
 * A simple example showing how to subscribe to a non-domain event.
 * In a distributed deployment you would publish to Redis pub/sub here
 * to propagate the change to other app instances.
 */
@Injectable()
export class SettingUpdatedSubscriber {
  private readonly logger = new Logger(SettingUpdatedSubscriber.name, { timestamp: true });

  @OnEvent(AppEvents.SETTING_UPDATED, { async: true })
  async handleSettingUpdated(payload: SettingUpdatedEvent) {
    this.logger.log(
      `[setting.updated] key=${payload.key} by=${payload.updatedBy ?? 'system'}`,
    );

    // Example — propagate to other instances via Redis pub/sub:
    // await this.redis.publish('settings:invalidated', payload.key);
  }

  @OnEvent(AppEvents.SETTING_RESET, { async: true })
  async handleSettingReset(payload: SettingResetEvent) {
    this.logger.log(
      `[setting.reset] key=${payload.key} by=${payload.updatedBy ?? 'system'}`,
    );
  }
}
