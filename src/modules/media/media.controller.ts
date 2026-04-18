import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { MediaService } from './media.service';
import { ProcessImageDto } from './dto/process-image.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Media')
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Upload and process a single image.
   * Returns JSON metadata; the processed image is sent as the response body.
   */
  @Post('image')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and process a single image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        width: { type: 'integer' },
        height: { type: 'integer' },
        format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'] },
        quality: { type: 'integer' },
      },
    },
  })
  async processImage(
    @UploadedFile() file: Express.Multer.File,
    @Query() options: ProcessImageDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const result = await this.mediaService.processImage(file, options);

    res.set({
      'Content-Type': `image/${result.format}`,
      'Content-Length': result.size,
      'X-Original-Size': result.originalSize,
      'X-Saved-Bytes': result.savedBytes,
      'Content-Disposition': `inline; filename="processed.${result.format}"`,
    });

    res.end(result.buffer);
  }

  /**
   * Upload and process a single image, returning JSON metadata only
   * (no binary response). Useful when you store to S3 separately.
   */
  @Post('image/info')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Process image and return metadata (no binary)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async processImageInfo(
    @UploadedFile() file: Express.Multer.File,
    @Query() options: ProcessImageDto,
  ) {
    const result = await this.mediaService.processImage(file, options);
    return this.mediaService.buildResponse(result, file.originalname);
  }

  /**
   * Generate multiple thumbnail sizes from one upload.
   * Returns a JSON map: { thumb: {...}, medium: {...}, large: {...} }
   */
  @Post('image/thumbnails')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Generate multiple thumbnail sizes from one upload',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async generateThumbnails(
    @UploadedFile() file: Express.Multer.File,
    @Query() options: ProcessImageDto,
  ) {
    const sizes = [
      { name: 'thumb', width: 100, height: 100 },
      { name: 'small', width: 320 },
      { name: 'medium', width: 640 },
      { name: 'large', width: 1280 },
    ];

    const results = await this.mediaService.generateThumbnails(file, sizes, options);

    return {
      success: true,
      data: Object.fromEntries(
        Object.entries(results).map(([key, r]) => [
          key,
          {
            format: r.format,
            width: r.width,
            height: r.height,
            size: r.size,
          },
        ]),
      ),
    };
  }

  /**
   * Inspect an image's metadata without processing it.
   */
  @Post('image/metadata')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Get image metadata without processing' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async getMetadata(@UploadedFile() file: Express.Multer.File) {
    this.mediaService.validateImage(file);
    const metadata = await this.mediaService.getMetadata(file.buffer);
    return { success: true, data: metadata };
  }
}
