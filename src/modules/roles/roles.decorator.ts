import { SetMetadata } from '@nestjs/common';
import { RoleType } from 'src/common/constants/roles-list.constants';

export const ROLES = 'ROLES';
export const Roles = (...args: RoleType[]) => SetMetadata(ROLES, args);
