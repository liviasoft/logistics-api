import { Prisma } from '@prisma/client';
import { PaginationFilter } from '../../../common/types';

export type FeatureFlagsFilter = {
  filters?: Prisma.FeatureFlagWhereInput;
  orderBy?:
    | Prisma.FeatureFlagOrderByWithRelationInput
    | Prisma.FeatureFlagOrderByWithRelationInput[];
};

export type FeatureFlagsFilterPaginated = Partial<
  FeatureFlagsFilter & PaginationFilter
>;
