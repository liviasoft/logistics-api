import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Amount in smallest currency unit (cents, kobo, etc.)', example: 5000 })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'usd' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({ description: 'Provider customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Saved payment method / token ID' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ enum: ['automatic', 'manual'], default: 'automatic' })
  @IsOptional()
  @IsEnum(['automatic', 'manual'])
  captureMethod?: 'automatic' | 'manual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Redirect URL after 3DS / Paystack checkout' })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
