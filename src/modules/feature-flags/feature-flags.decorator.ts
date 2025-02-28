import { SetMetadata } from '@nestjs/common';
import { FeatureFlagType } from 'src/common/constants';

export const FEATURE_FLAGS = 'FEATURE_FLAGS';
export const FeatureFlags = (...args: FeatureFlagType[]) =>
  SetMetadata('FEATURE_FLAGS', args);
