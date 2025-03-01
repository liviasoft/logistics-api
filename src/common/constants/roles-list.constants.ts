export const RolesList = {
  DEVELOPER: 'DEVELOPER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CUSTOMER: 'CUSTOMER',
  SUPPORT: 'SUPPORT',
  OPERATIONS: 'OPERATIONS',
  ADMIN: 'ADMIN',
} as const;

export type RoleType = keyof typeof RolesList;
