import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';

export function IsNotEmptyString(fieldName: string = 'String field') {
  return applyDecorators(
    IsString({ message: `${fieldName} must be a string` }),
    IsNotEmpty({ message: `${fieldName} cannot be empty` }),
  );
}
