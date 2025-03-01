export const FeatureFlagsList = {
  DEVELOPER_SIGNUP: 'DEVELOPER_SIGNUP',
  DEVELOPER_LOGIN: 'DEVELOPER_LOGIN',
  REGISTER_ORGANIZATION: 'REGISTER_ORGANIZATION',
  REGISTER_CLIENT_APP: 'REGISTER_CLIENT_APP',
} as const;

export type FeatureFlagType = keyof typeof FeatureFlagsList;
