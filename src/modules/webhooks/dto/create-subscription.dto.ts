import { IsUrl, IsArray, IsString, ArrayMinSize, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'https://example.com/webhooks',
    description: 'HTTPS URL that will receive POST requests',
  })
  @IsUrl({ protocols: ['https', 'http'], require_tld: false })
  url: string;

  @ApiProperty({
    example: ['user.created', 'order.completed'],
    description: 'List of event names to subscribe to. Use * to subscribe to all events.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  events: string[];

  @ApiPropertyOptional({ example: 'Production order hooks for our fulfillment service' })
  @IsOptional()
  @IsString()
  description?: string;
}
