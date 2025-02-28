import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class AsyncStorageService implements OnModuleInit {
  private readonly logger = new Logger(AsyncLocalStorage.name, {
    timestamp: true,
  });
  private asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

  onModuleInit() {
    this.logger.log('AsyncLocalStorage initialized');
  }

  run<T>(callback: () => T): T {
    return this.asyncLocalStorage.run(new Map(), callback);
  }

  set(key: string, value: any) {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.set(key, value);
      this.logger.log(`Set "${key}"`);
    }
  }

  get<T>(key: string): T | undefined {
    return this.asyncLocalStorage.getStore()?.get(key);
  }

  getStore(): Map<string, any> | undefined {
    return this.asyncLocalStorage.getStore();
  }
}
