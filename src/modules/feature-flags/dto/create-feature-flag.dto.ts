import { IsBoolean } from 'class-validator';
import { IsNotEmptyString, IsValidKeyName } from '../../../common/validators';

export class CreateFeatureFlagDto {
  id?: string;

  @IsValidKeyName('Name')
  name: string;

  @IsNotEmptyString('Description')
  description?: string;

  @IsNotEmptyString('Error Message')
  errorMessage?: string;

  @IsBoolean()
  enabled: boolean;
}
