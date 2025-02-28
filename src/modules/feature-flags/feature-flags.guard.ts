import {
  CanActivate,
  ExecutionContext,
  Injectable,
  MethodNotAllowedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAGS } from './feature-flags.decorator';
import { BaseGuard } from '../../common/base.guard';
import { PrismaService } from '../../datasources/prisma/prisma.service';

class FeatureDisabledException extends MethodNotAllowedException {
  constructor(message?: string) {
    super(message ?? 'This Feature is not enabled');
  }
}

@Injectable()
export class FeatureFlagsGuard extends BaseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    super();
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureNames = this.reflector.getAllAndMerge<string[]>(
      FEATURE_FLAGS,
      [context.getClass(), context.getHandler()],
    );

    if (!featureNames || !featureNames.length) return true;

    const featureFlags = await this.getFeatureFlags(featureNames, this.prisma);

    for (let i = 0; i < featureNames.length; i++) {
      const name = featureNames[i];
      if (!featureFlags[name]) {
        throw new FeatureDisabledException(`Unrecognized Feature - ${name}`);
      }
      if (!featureFlags[name]['enabled']) {
        throw new FeatureDisabledException(featureFlags[name]['errorMessage']);
      }
    }
    return true;
  }
}
