import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OrganizationService } from './organization.service';

@Injectable()
export class OrganizationsInterceptor implements NestInterceptor {
  constructor(private readonly organizationService: OrganizationService) {}
  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const organizationId = req.params?.organizationId;

    if (organizationId) {
      const organization =
        await this.organizationService.findOrganizationById(organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization not found`);
      }
      res.locals.organization = organization;
    }
    return next.handle();
  }
}
