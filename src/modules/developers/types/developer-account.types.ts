import { Prisma } from '@prisma/client';
import { PaginationFilter } from '../../../common/types';

export type DeveloperAccountFilters = {
  filters?: Prisma.DeveloperAccountWhereInput;
  orderBy?:
    | Prisma.DeveloperAccountOrderByWithRelationInput
    | Prisma.DeveloperAccountOrderByWithRelationInput[];
  includes?: Prisma.DeveloperAccountInclude;
};

export type DeveloperAccountFiltersPaginated = Partial<
  DeveloperAccountFilters & PaginationFilter
>;
