import { OrgType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(OrgType)
  type: string;
}
