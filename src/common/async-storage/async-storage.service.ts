import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

type Store = Map<string, unknown>;

@Injectable()
export class AsyncStorageService implements OnModuleInit {
  private readonly logger = new Logger(AsyncLocalStorage.name, {
    timestamp: true,
  });
  private asyncLocalStorage = new AsyncLocalStorage<Store>();

  onModuleInit() {
    this.logger.log('AsyncLocalStorage initialized');
  }

  run<T>(callback: () => T): T {
    return this.asyncLocalStorage.run(new Map(), callback);
  }

  set(key: string, value: unknown) {
    const store = this.asyncLocalStorage.getStore();
    if (store) store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.asyncLocalStorage.getStore()?.get(key) as T | undefined;
  }

  getStore(): Store | undefined {
    return this.asyncLocalStorage.getStore();
  }

  // ── Typed helpers ─────────────────────────────────────────────────────────

  getRequestId(): string | undefined {
    return this.get<string>('requestId');
  }

  getUserId(): string | undefined {
    return this.get<string>('userId');
  }

  setUserId(userId: string) {
    this.set('userId', userId);
  }

  /** BCP 47 locale tag e.g. 'en', 'fr', 'en-GB' */
  getLocale(): string | undefined {
    return this.get<string>('locale');
  }

  setLocale(locale: string) {
    this.set('locale', locale);
  }

  /** IANA timezone identifier e.g. 'Europe/London' */
  getTimezone(): string | undefined {
    return this.get<string>('timezone');
  }

  setTimezone(timezone: string) {
    this.set('timezone', timezone);
  }
}
