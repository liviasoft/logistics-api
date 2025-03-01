import { OrgRole, OrgType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { IsNotEmptyString } from '../../../common/validators';

export class CreateOrganizationDto {
  @IsOptional()
  id?: string;

  @IsNotEmptyString('Organization name')
  name: string;

  // @IsOptional()
  @IsEnum(OrgType)
  type: string;
}

export class CreateOrganizationMemberDto {
  @IsNotEmptyString('Account User Id')
  accountId: string;

  @IsNotEmptyString('Organization Id')
  organizationId: string;

  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;
}
