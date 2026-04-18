# User Preferences

Per-user settings stored as JSONB on the `User` model — one DB read returns all preferences, and they can be read anywhere with a three-tier fallback chain.

---

## Fallback chain (highest → lowest priority)

```
User's stored preference  →  Global Setting (settings.config.ts)  →  Coded default
```

| Tier | Where | Example |
|---|---|---|
| 1 — User override | `User.preferences` JSONB column | User set `locale = 'fr'` |
| 2 — Global setting | `SettingsService.get('user.default.locale')` | Admin set default to `'de'` |
| 3 — Coded default | `defaultUserPreferences.locale` | `'en'` |

---

## Available preferences

Defined in `src/modules/users/user-preferences.config.ts`:

| Key | Type | Default | Description |
|---|---|---|---|
| `locale` | `string` | `'en'` | BCP 47 locale tag |
| `timezone` | `string` | `'UTC'` | IANA timezone identifier |
| `currency` | `string` | `'usd'` | ISO 4217 currency code |
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | UI theme |
| `emailMarketing` | `boolean` | `true` | Marketing email opt-in |
| `emailProductUpdates` | `boolean` | `true` | Product updates opt-in |
| `smsNotifications` | `boolean` | `false` | SMS opt-in |

To add a preference, edit only `user-preferences.config.ts`:

```typescript
export interface UserPreferenceMap {
  // ...existing...
  'dashboardLayout': 'grid' | 'list';
}

export const defaultUserPreferences: UserPreferenceMap = {
  // ...existing...
  dashboardLayout: 'grid',
};
```

---

## API

```
GET    /api/v1/users/me/preferences          → get all preferences
PATCH  /api/v1/users/me/preferences          → update one or more
DELETE /api/v1/users/me/preferences/reset    → reset ALL to defaults
DELETE /api/v1/users/me/preferences/:key     → reset ONE to default
```

All routes require Bearer authentication.

---

## Service usage

`UserPreferencesService` is exported from `UsersModule`. Import `UsersModule` to use it.

```typescript
import { UserPreferencesService } from '../users/user-preferences.service';

constructor(private readonly userPreferences: UserPreferencesService) {}

// Three-tier get (user pref → global setting → coded default)
const locale = await this.userPreferences.get(userId, 'locale');

// Get all prefs merged with coded defaults
const prefs = await this.userPreferences.getAll(userId);

// Patch (shallow merge — unspecified keys are preserved)
await this.userPreferences.patch(userId, { locale: 'fr', timezone: 'Europe/Paris' });

// Reset one
await this.userPreferences.reset(userId, 'theme');

// Reset all
await this.userPreferences.resetAll(userId);
```

---

## Global locale/timezone defaults

The app-level defaults for locale and timezone are themselves overridable at runtime via the settings system:

```typescript
// In SettingsService (admin API)
await this.settings.set('user.default.locale',   'de', adminUserId);
await this.settings.set('user.default.timezone', 'Europe/Berlin', adminUserId);
```

Users who have not set their own preference will see the new global default immediately (no restart required).
