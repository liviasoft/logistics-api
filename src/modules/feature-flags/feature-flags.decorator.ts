import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAGS = 'FEATURE_FLAGS';
export const FeatureFlags = (...args: string[]) =>
  SetMetadata('FEATURE_FLAGS', args);
