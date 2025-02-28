export const FeatureFlagsList = {
  DEVELOPER_SIGNUP: 'DEVELOPER_SIGNUP',
  DEVELOPER_LOGIN: 'DEVELOPER_LOGIN',
  REGISTER_ORGANIZATION: 'REGISTER_ORGANIZATION',
  CREATE_CLIENT_APP: 'CREATE_CLIENT_APP',
} as const;

export type FeatureFlagType = keyof typeof FeatureFlagsList;
