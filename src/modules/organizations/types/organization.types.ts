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

export type OrganizationMemberFilters = {
  filters?: Prisma.OrganizationMemberWhereInput;
  orderBy?:
    | Prisma.OrganizationMemberOrderByWithRelationInput
    | Prisma.OrganizationMemberOrderByWithRelationInput[];
  includes?: Prisma.OrganizationMemberInclude;
};

export type OrganizationMemberFiltersPaginated = Partial<
  OrganizationMemberFilters & PaginationFilter
>;
