import {
  CanActivate,
  ExecutionContext,
  Injectable,
  MethodNotAllowedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// import { Observable } from 'rxjs';
import { FEATURE_FLAGS } from './feature-flags.decorator';
import { PrismaService } from '../../datasources/prisma/prisma.service';

class FeatureDisabledException extends MethodNotAllowedException {
  constructor(message?: string) {
    super(message ?? 'This Feature is not enabled');
  }
}

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureNames = this.reflector.get<string[]>(
      FEATURE_FLAGS,
      context.getClass(),
    );

    if (!featureNames || !featureNames.length) return true;

    const featureFlags = await this.getFeatureFlags(featureNames);

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

  private async getFeatureFlags(names: string[]) {
    const ffmap: {
      [key: string]: {
        enabled: boolean;
        id: string;
        name: string;
        errorMessage?: string;
      };
    } = {};
    const ffs = await this.prisma.featureFlag.findMany({
      where: { name: { in: names, mode: 'insensitive' } },
      select: { enabled: true, name: true, id: true, errorMessage: true },
    });
    ffs.forEach((ff) => {
      const { name, id, enabled, errorMessage } = ff;
      ffmap[name] = { id, name, enabled, errorMessage };
    });
    return ffmap;
  }
}

@Injectable()
export class FeatureFlagsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureNames = this.reflector.get<string[]>(
      FEATURE_FLAGS,
      context.getHandler(),
    );

    if (!featureNames || !featureNames.length) return true;

    const featureFlags = await this.getFeatureFlags(featureNames);

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

  private async getFeatureFlags(names: string[]) {
    const ffmap: {
      [key: string]: {
        enabled: boolean;
        id: string;
        name: string;
        errorMessage?: string;
      };
    } = {};
    const ffs = await this.prisma.featureFlag.findMany({
      where: { name: { in: names, mode: 'insensitive' } },
      select: { enabled: true, name: true, id: true, errorMessage: true },
    });
    ffs.forEach((ff) => {
      const { name, id, enabled, errorMessage } = ff;
      ffmap[name] = { id, name, enabled, errorMessage };
    });
    return ffmap;
  }
}
