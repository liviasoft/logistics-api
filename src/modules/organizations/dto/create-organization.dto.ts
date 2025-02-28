import { OrgType } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { IsNotEmptyString } from '../../../common/validators';

export class CreateOrganizationDto {
  @IsNotEmptyString('Organization name')
  name: string;

  // @IsOptional()
  @IsEnum(OrgType)
  type: string;
}
