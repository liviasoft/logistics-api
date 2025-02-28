import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name, {
    timestamp: true,
  });
  constructor(
    private jwtService: JwtService,
    private readonly asyncStorageService: AsyncStorageService,
  ) {}
  async use(req: Request, _: Response, next: NextFunction) {
    const store = this.asyncStorageService.getStore();
    const authorization = req.headers?.authorization;
    const token = authorization?.split(' ')[1];
    if (!token) {
      return next();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      store.set('auth', payload);
      this.logger.log({ auth: store.get('auth') });
    } catch (error: any) {
      this.logger.error(error);
    }
    next();
  }
}
