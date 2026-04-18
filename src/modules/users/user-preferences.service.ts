import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  UserPreferenceKey,
  UserPreferenceMap,
  defaultUserPreferences,
} from './user-preferences.config';

// Global-setting keys that mirror user preferences for the default fallback tier
const GLOBAL_SETTING_FALLBACKS: Partial<Record<UserPreferenceKey, string>> = {
  locale:   'user.default.locale',
  timezone: 'user.default.timezone',
} as const;

@Injectable()
export class UserPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Get a single preference for a user.
   *
   * Resolution order:
   *   1. User's stored preference (JSONB column)
   *   2. Global Setting override (e.g. 'user.default.locale')
   *   3. Coded default from defaultUserPreferences
   */
  async get<K extends UserPreferenceKey>(userId: string, key: K): Promise<UserPreferenceMap[K]> {
    const stored = await this.getAll(userId);
    if (stored[key] !== undefined && stored[key] !== null) {
      return stored[key];
    }

    const globalKey = GLOBAL_SETTING_FALLBACKS[key];
    if (globalKey) {
      const globalValue = this.settings.get(globalKey as any);
      if (globalValue !== undefined && globalValue !== null) {
        return globalValue as UserPreferenceMap[K];
      }
    }

    return defaultUserPreferences[key];
  }

  /**
   * Get all preferences for a user, merging stored values over coded defaults.
   * Does NOT apply the three-tier fallback — returns only the user's own stored prefs
   * merged with coded defaults. Use get() for the full fallback chain.
   */
  async getAll(userId: string): Promise<UserPreferenceMap> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const stored = (user.preferences ?? {}) as Partial<UserPreferenceMap>;
    return { ...defaultUserPreferences, ...stored };
  }

  /**
   * Update one or more preferences for a user. Performs a shallow merge —
   * keys not included in the patch are preserved.
   */
  async patch(userId: string, patch: Partial<UserPreferenceMap>): Promise<UserPreferenceMap> {
    const current = await this.getAll(userId);
    const updated = { ...current, ...patch };

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updated },
    });

    return updated;
  }

  /**
   * Reset one preference to its default (removes it from the stored JSONB so the
   * fallback chain takes over on next read).
   */
  async reset(userId: string, key: UserPreferenceKey): Promise<UserPreferenceMap> {
    const current = await this.getAll(userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _removed, ...rest } = current;

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: rest },
    });

    return { ...defaultUserPreferences, ...rest };
  }

  /**
   * Reset all preferences to defaults (clears the JSONB column).
   */
  async resetAll(userId: string): Promise<UserPreferenceMap> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: {} },
    });
    return { ...defaultUserPreferences };
  }
}
