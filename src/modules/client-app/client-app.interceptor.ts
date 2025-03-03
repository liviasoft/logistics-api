import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ClientAppService } from './client-app.service';

@Injectable()
export class ClientAppInterceptor implements NestInterceptor {
  constructor(private readonly clientAppService: ClientAppService) {}
  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const clientAppId = req.params?.appId;

    if (clientAppId) {
      const clientApp =
        await this.clientAppService.findClientAppById(clientAppId);
      if (!clientApp) {
        throw new NotFoundException(`Client App not found`);
      }
      res.locals.clientApp = clientApp;
    }
    return next.handle();
  }
}
