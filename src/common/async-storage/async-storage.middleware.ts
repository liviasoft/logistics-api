import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncStorageService } from './async-storage.service';
import { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'bson';

const SUPPORTED_LOCALES = ['en', 'fr'];
const DEFAULT_LOCALE = 'en';

function parseLocale(header: string | undefined): string {
  if (!header) return DEFAULT_LOCALE;

  // Parse 'Accept-Language: fr-FR,fr;q=0.9,en;q=0.8' → ['fr', 'en', ...]
  const locales = header
    .split(',')
    .map((part) => {
      const [tag] = part.trim().split(';');
      return tag.trim().split('-')[0].toLowerCase(); // normalise 'fr-FR' → 'fr'
    });

  return locales.find((l) => SUPPORTED_LOCALES.includes(l)) ?? DEFAULT_LOCALE;
}

@Injectable()
export class AsyncStorageMiddleware implements NestMiddleware {
  constructor(private readonly asyncStorageService: AsyncStorageService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.asyncStorageService.run(() => {
      this.asyncStorageService.set('requestId', new ObjectId().toString());
      this.asyncStorageService.setLocale(
        parseLocale(req.headers['accept-language']),
      );
      next();
    });
  }
}
