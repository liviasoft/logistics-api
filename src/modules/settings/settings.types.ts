import { AppSettings } from './settings.config';

export type SettingKey = keyof AppSettings;
export type SettingValue<K extends SettingKey = SettingKey> = AppSettings[K];

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsSnapshot {
  /** Merged result of coded defaults + DB overrides */
  settings: AppSettings;
  /** Which keys have been overridden in the DB */
  overrides: string[];
}
