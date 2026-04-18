import { Injectable, ExecutionContext } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';
import { AsyncStorageService } from '../async-storage/async-storage.service';

/**
 * Reads the locale that AsyncStorageMiddleware already extracted from the
 * Accept-Language header.  Registered as the first resolver in I18nModule so
 * it takes priority over the built-in AcceptLanguageResolver.
 */
@Injectable()
export class AsyncStorageLocaleResolver implements I18nResolver {
  constructor(private readonly asyncStorage: AsyncStorageService) {}

  resolve(_context: ExecutionContext): string | undefined {
    return this.asyncStorage.getLocale();
  }
}
