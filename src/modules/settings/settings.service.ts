import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { AppSettings, defaultSettings } from './settings.config';
import { SettingKey, SettingsSnapshot } from './settings.types';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name, { timestamp: true });

  /**
   * In-process cache: merged defaults + DB overrides.
   * Populated on module init, updated synchronously on every write.
   * Reads are O(1) with no async overhead.
   */
  private cache: AppSettings = { ...defaultSettings };

  /** Tracks which keys have active DB overrides */
  private overriddenKeys = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit() {
    await this.loadFromDb();
    this.logger.log(`Settings loaded — ${this.overriddenKeys.size} DB override(s)`);
  }

  private async loadFromDb(): Promise<void> {
    const records = await this.prisma.setting.findMany();

    // Start from coded defaults, then overlay DB overrides
    this.cache = { ...defaultSettings };
    this.overriddenKeys.clear();

    for (const record of records) {
      if (record.key in defaultSettings) {
        (this.cache as unknown as Record<string, unknown>)[record.key] = record.value;
        this.overriddenKeys.add(record.key);
      } else {
        this.logger.warn(`Setting "${record.key}" exists in DB but not in AppSettings — ignoring`);
      }
    }
  }

  // ── Read (synchronous — cache is always warm) ──────────────────────────────

  /**
   * Get a setting value. Fully typed — return type matches the key.
   *
   * @example
   * const inMaintenance = this.settings.get('app.maintenanceMode'); // boolean
   * const currencies    = this.settings.get('payments.allowedCurrencies'); // string[]
   */
  get<K extends SettingKey>(key: K): AppSettings[K] {
    return this.cache[key];
  }

  /**
   * Get all settings as a merged snapshot of defaults + DB overrides.
   */
  getAll(): SettingsSnapshot {
    return {
      settings:  { ...this.cache },
      overrides: Array.from(this.overriddenKeys),
    };
  }

  /**
   * Check whether a key has an active DB override.
   */
  isOverridden(key: SettingKey): boolean {
    return this.overriddenKeys.has(key);
  }

  // ── Write (async — persists to DB) ────────────────────────────────────────

  /**
   * Update a setting. Persists to DB and updates the in-process cache immediately.
   * Emits a `setting.updated` event so other modules can react.
   *
   * @example
   * await this.settings.set('app.maintenanceMode', true, adminUserId);
   */
  async set<K extends SettingKey>(
    key: K,
    value: AppSettings[K],
    updatedBy?: string,
  ): Promise<void> {
    await this.prisma.setting.upsert({
      where:  { key },
      create: { key, value: value as object, updatedBy },
      update: { value: value as object, updatedBy },
    });

    // Update cache synchronously so subsequent get() calls see the new value immediately
    this.cache[key] = value;
    this.overriddenKeys.add(key);

    this.events.emit('setting.updated', { key, value, updatedBy });
    this.logger.log(`Setting "${key}" updated by ${updatedBy ?? 'system'}`);
  }

  /**
   * Reset a setting to its coded default by removing the DB override.
   */
  async reset<K extends SettingKey>(key: K, updatedBy?: string): Promise<void> {
    await this.prisma.setting.deleteMany({ where: { key } });

    this.cache[key] = defaultSettings[key];
    this.overriddenKeys.delete(key);

    this.events.emit('setting.reset', { key, value: defaultSettings[key], updatedBy });
    this.logger.log(`Setting "${key}" reset to default by ${updatedBy ?? 'system'}`);
  }

  /**
   * Reload all settings from the DB. Useful in distributed deployments where
   * another instance may have written a new value.
   */
  async refresh(): Promise<void> {
    await this.loadFromDb();
    this.logger.log('Settings cache refreshed');
  }
}
