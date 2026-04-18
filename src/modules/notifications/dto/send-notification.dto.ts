import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '../notifications.types';

export class SendNotificationDto {
  @ApiProperty({ description: 'Recipient email address or E.164 phone number', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ enum: ['email', 'sms'] })
  @IsEnum(['email', 'sms'])
  channel: NotificationChannel;

  @ApiPropertyOptional({ description: 'Email subject (required for email channel)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Plain text body / SMS message' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: 'HTML email body' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ description: 'Provider template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Override default sender address/number' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
