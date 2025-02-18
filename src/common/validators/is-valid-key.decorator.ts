import { applyDecorators } from '@nestjs/common';
import { IsString, IsUppercase, Matches } from 'class-validator';

export function IsValidKeyName(fieldName: string = 'Key') {
  return applyDecorators(
    IsString(),
    IsUppercase(),
    Matches(/^[A-Z0-9_]*$/, {
      message: `${fieldName} must contain only alphanumeric characters and underscores`,
    }),
  );
}
