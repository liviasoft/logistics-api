import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncStorageService } from './async-storage.service';
import { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'bson';

@Injectable()
export class AsyncStorageMiddleware implements NestMiddleware {
  constructor(private readonly asyncStorageService: AsyncStorageService) {}
  use(req: Request, res: Response, next: NextFunction) {
    this.asyncStorageService.run(() => {
      this.asyncStorageService.set('requestId', new ObjectId());
      next();
    });
  }
}
