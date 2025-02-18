import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFeatureFlagDto } from './create-feature-flag.dto';

export class UpdateFeatureFlagDto extends OmitType(
  PartialType(CreateFeatureFlagDto),
  ['id', 'enabled'],
) {}
