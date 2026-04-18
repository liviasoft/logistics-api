import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import sharp from 'sharp';
import { ProcessOptions, ProcessResult } from './media.types';
import { BaseService } from '../../common/base.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/tiff',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class MediaService extends BaseService {
  private readonly logger = new Logger(MediaService.name, { timestamp: true });

  /**
   * Validate and process a single image buffer.
   *
   * - Validates MIME type and file size
   * - Resizes, converts format, strips metadata as requested
   * - Returns a ProcessResult with the output buffer and metadata
   */
  async processImage(
    file: Express.Multer.File,
    options: ProcessOptions = {},
  ): Promise<ProcessResult> {
    this.validateImage(file);

    const {
      width,
      height,
      format,
      quality = 80,
      stripMetadata = true,
      fit = 'cover',
    } = options;

    const originalSize = file.size;
    let pipeline = sharp(file.buffer);

    if (stripMetadata) {
      pipeline = pipeline.rotate(); // auto-rotate from EXIF, then strip
    }

    if (width || height) {
      pipeline = pipeline.resize({ width, height, fit });
    }

    // Output format
    const outputFormat = format ?? (this.mimeToFormat(file.mimetype) as any);
    pipeline = pipeline.toFormat(outputFormat, { quality });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    this.logger.log(
      `Processed image: ${file.originalname} → ${info.format} ` +
      `${info.width}×${info.height} (${originalSize} → ${info.size} bytes)`,
    );

    return {
      buffer: data,
      format: info.format,
      width: info.width,
      height: info.height,
      size: info.size,
      originalSize,
      savedBytes: originalSize - info.size,
    };
  }

  /**
   * Generate multiple thumbnail sizes from one upload.
   * Useful for responsive images or avatars.
   */
  async generateThumbnails(
    file: Express.Multer.File,
    sizes: Array<{ name: string; width: number; height?: number }>,
    options: Omit<ProcessOptions, 'width' | 'height'> = {},
  ): Promise<Record<string, ProcessResult>> {
    this.validateImage(file);

    const results: Record<string, ProcessResult> = {};

    await Promise.all(
      sizes.map(async ({ name, width, height }) => {
        results[name] = await this.processImage(file, {
          ...options,
          width,
          height,
        });
      }),
    );

    return results;
  }

  /**
   * Extract image metadata without processing.
   */
  async getMetadata(buffer: Buffer) {
    return sharp(buffer).metadata();
  }

  /**
   * Convert an image to a specific format only (no resize).
   */
  async convert(
    file: Express.Multer.File,
    format: ProcessOptions['format'],
    quality = 80,
  ): Promise<ProcessResult> {
    return this.processImage(file, { format, quality });
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  validateImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. ` +
        `Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 10 MB`,
      );
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  buildResponse(result: ProcessResult, filename: string) {
    return this.formatResponse({
      data: {
        filename,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.size,
        originalSize: result.originalSize,
        savedBytes: result.savedBytes,
        compressionRatio: +(result.originalSize / result.size).toFixed(2),
      },
      message: 'Image processed successfully',
      statusCode: HttpStatus.OK,
    });
  }

  private mimeToFormat(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'image/gif': 'gif',
      'image/tiff': 'tiff',
    };
    return map[mime] ?? 'jpeg';
  }
}
