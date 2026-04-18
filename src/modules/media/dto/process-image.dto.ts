import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessImageDto {
  @ApiPropertyOptional({ example: 800, description: 'Target width in px' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8000)
  width?: number;

  @ApiPropertyOptional({ example: 600, description: 'Target height in px' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8000)
  height?: number;

  @ApiPropertyOptional({ enum: ['jpeg', 'png', 'webp', 'avif', 'gif'] })
  @IsOptional()
  @IsIn(['jpeg', 'png', 'webp', 'avif', 'gif'])
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';

  @ApiPropertyOptional({ example: 80, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiPropertyOptional({ enum: ['cover', 'contain', 'fill', 'inside', 'outside'] })
  @IsOptional()
  @IsIn(['cover', 'contain', 'fill', 'inside', 'outside'])
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

  @ApiPropertyOptional({ default: true, description: 'Strip EXIF metadata' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  stripMetadata?: boolean;
}
