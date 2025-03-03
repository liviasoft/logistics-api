import { Prisma } from '@prisma/client';
import { PaginationFilter } from '../../../common/types';

export type OrganizationFilters = {
  filters?: Prisma.OrganizationWhereInput;
  orderBy?:
    | Prisma.OrganizationOrderByWithRelationInput
    | Prisma.OrganizationOrderByWithRelationInput[];
  includes?: Prisma.OrganizationInclude;
};

export type OrganizationFiltersPaginated = Partial<
  OrganizationFilters & PaginationFilter
>;
