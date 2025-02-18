import { IsBoolean, IsString } from 'class-validator';
import { IsValidKeyName } from '../../../common/validators';

export class CreateFeatureFlagDto {
  id?: string;

  @IsValidKeyName('name')
  name: string;

  @IsString()
  description?: string;

  @IsBoolean()
  enabled: boolean;
}
