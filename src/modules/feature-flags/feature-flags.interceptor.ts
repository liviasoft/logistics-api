import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class FeatureFlagsInterceptor implements NestInterceptor {
  constructor(private readonly featureFlagService: FeatureFlagsService) {}
  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const featureFlagId = req.params?.featureFlagId;

    if (featureFlagId) {
      const featureFlag =
        await this.featureFlagService.findFeatureFlagById(featureFlagId);
      if (!featureFlag) {
        throw new NotFoundException(`Organization not found`);
      }
      res.locals.featureFlag = featureFlag;
    }
    return next.handle();
  }
}
