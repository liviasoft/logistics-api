import { IsUrl, IsArray, IsString, IsOptional, IsBoolean, ArrayMinSize, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: 'https://example.com/webhooks/v2' })
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_tld: false })
  url?: string;

  @ApiPropertyOptional({ example: ['user.created', 'order.completed'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  events?: string[];

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
