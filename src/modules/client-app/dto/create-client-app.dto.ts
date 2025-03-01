import { IsOptional, IsString } from 'class-validator';
import { IsNotEmptyString } from '../../../common/validators';

export class CreateClientAppDto {
  @IsNotEmptyString('Application Name')
  name: string;

  @IsNotEmptyString('Organization Id')
  organizationId: string;

  @IsOptional()
  @IsString()
  description?: string;
}
