import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { DevelopersService } from './developers.service';
import { Request, Response } from 'express';

@Injectable()
export class DevelopersInterceptor implements NestInterceptor {
  constructor(private readonly developerService: DevelopersService) {}
  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const developerId = req.params?.developerId;

    if (developerId) {
      const developer =
        await this.developerService.findAccountById(developerId);
      if (!developer) {
        throw new NotFoundException(`Client App not found`);
      }
      res.locals.developer = developer;
    }
    return next.handle();
  }
}
