/**
 * User Preferences Configuration
 *
 * This is the single file you edit to add or remove per-user preferences.
 *
 * Steps:
 *   1. Add your key to the UserPreferenceMap interface
 *   2. Add a default in defaultUserPreferences
 *   3. Call userPreferencesService.get(userId, 'your.key') anywhere
 *
 * Three-tier fallback (highest → lowest priority):
 *   User-stored pref  →  Global Setting (settings.config.ts)  →  Coded default below
 *
 * User preferences are stored as JSONB on User.preferences — one DB read loads all of them.
 */

// =============================================================================
// Step 1 — Declare preference keys and their types
// =============================================================================

export interface UserPreferenceMap {
  /** BCP 47 locale tag e.g. 'en', 'fr', 'en-GB' */
  locale: string;
  /** IANA timezone identifier e.g. 'Europe/London', 'America/New_York' */
  timezone: string;
  /** ISO 4217 currency code for display formatting */
  currency: string;
  /** 'light' | 'dark' | 'system' */
  theme: 'light' | 'dark' | 'system';
  /** Whether to receive marketing emails */
  emailMarketing: boolean;
  /** Whether to receive product update emails */
  emailProductUpdates: boolean;
  /** Whether to receive SMS notifications */
  smsNotifications: boolean;
  // Add your own preferences below
}

export type UserPreferenceKey = keyof UserPreferenceMap;

// =============================================================================
// Step 2 — Coded fallback defaults (used when no user pref or global Setting exists)
// =============================================================================

export const defaultUserPreferences: UserPreferenceMap = {
  locale:              'en',
  timezone:            'UTC',
  currency:            'usd',
  theme:               'system',
  emailMarketing:      true,
  emailProductUpdates: true,
  smsNotifications:    false,
};
