/**
 * Feature flags for controlling feature availability
 *
 * Usage:
 * 1. Add flag name here
 * 2. Create flag in database (via seed or API)
 * 3. Use @FeatureFlags(FeatureFlagsList.YOUR_FLAG) decorator on routes
 */
export const FeatureFlagsList = {
  // Example flags - customize for your application
  USER_REGISTRATION: 'USER_REGISTRATION',
  BETA_FEATURES: 'BETA_FEATURES',
} as const;

export type FeatureFlagType = keyof typeof FeatureFlagsList;
