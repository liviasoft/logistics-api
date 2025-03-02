import { FeatureFlagsInterceptor } from './feature-flags.interceptor';

describe('FeatureFlagsInterceptor', () => {
  it('should be defined', () => {
    expect(new FeatureFlagsInterceptor()).toBeDefined();
  });
});
