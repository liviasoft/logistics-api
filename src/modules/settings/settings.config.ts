/**
 * Application Settings Configuration
 *
 * This is the single file you edit to add or remove application settings.
 *
 * Steps:
 *   1. Add your key to the AppSettings interface (gives you full type safety)
 *   2. Add a default value in defaultSettings
 *   3. Inject SettingsService anywhere and call settings.get('your.key')
 *
 * Rules:
 *   - Keys use dot-notation by convention: 'module.settingName'
 *   - Values must be JSON-serialisable (string, number, boolean, array, object)
 *   - Defaults are used when no DB override exists — the DB starts empty and the
 *     app works immediately with no migration data needed
 */

// =============================================================================
// Step 1 — Declare your settings keys and their types
// =============================================================================

export interface AppSettings {
  // ── Application ────────────────────────────────────────────────────────────
  /** Put the app into read-only maintenance mode */
  'app.maintenanceMode': boolean;
  /** Message shown to users during maintenance */
  'app.maintenanceMessage': string;

  // ── Uploads / Storage ──────────────────────────────────────────────────────
  /** Maximum upload file size in megabytes */
  'storage.maxUploadSizeMb': number;
  /** Allowed MIME types for uploads (empty = all allowed) */
  'storage.allowedMimeTypes': string[];

  // ── Notifications ──────────────────────────────────────────────────────────
  /** Default sender name used in outbound emails */
  'notifications.defaultFromName': string;
  /** Whether to send welcome emails on user registration */
  'notifications.sendWelcomeEmail': boolean;

  // ── Payments ───────────────────────────────────────────────────────────────
  /** ISO 4217 currency codes accepted by the app */
  'payments.allowedCurrencies': string[];
  /** Minimum payment amount in smallest unit (cents/kobo/etc.) */
  'payments.minimumAmount': number;

  // ── Auth ───────────────────────────────────────────────────────────────────
  /** How long (in days) a refresh token remains valid */
  'auth.refreshTokenTtlDays': number;
  /** Maximum failed login attempts before temporary lockout */
  'auth.maxFailedLoginAttempts': number;

  // ── Localisation defaults ──────────────────────────────────────────────────
  /** Default locale for users who have not set a preference (BCP 47 tag) */
  'user.default.locale': string;
  /** Default timezone for users who have not set a preference (IANA tz id) */
  'user.default.timezone': string;

  // ── Add your own settings below ────────────────────────────────────────────
}

// =============================================================================
// Step 2 — Provide a default for every key above
// =============================================================================

export const defaultSettings: AppSettings = {
  'app.maintenanceMode':               false,
  'app.maintenanceMessage':            'We are currently performing maintenance. Please try again shortly.',

  'storage.maxUploadSizeMb':           50,
  'storage.allowedMimeTypes':          [],

  'notifications.defaultFromName':     'YourApp',
  'notifications.sendWelcomeEmail':    true,

  'payments.allowedCurrencies':        ['usd', 'gbp', 'eur', 'ngn'],
  'payments.minimumAmount':            100,

  'auth.refreshTokenTtlDays':          7,
  'auth.maxFailedLoginAttempts':       5,

  'user.default.locale':               'en',
  'user.default.timezone':             'UTC',
};
