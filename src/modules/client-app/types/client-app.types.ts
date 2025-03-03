import { Prisma } from '@prisma/client';
import { PaginationFilter } from '../../../common/types';

export type ClientAppFilters = {
  filters?: Prisma.ClientAppWhereInput;
  orderBy?:
    | Prisma.ClientAppOrderByWithRelationInput
    | Prisma.ClientAppOrderByWithRelationInput[];
  includes?: Prisma.ClientAppInclude;
};

export type ClientAppFiltersPaginated = Partial<
  ClientAppFilters & PaginationFilter
>;
