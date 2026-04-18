import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StorageService } from './storage.service';
import { UploadFileDto } from './dto';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  // ── Upload ────────────────────────────────────────────────────────────────

  @Post('upload')
  @Version('1')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to the active storage provider' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file:     { type: 'string', format: 'binary' },
        key:      { type: 'string' },
        isPublic: { type: 'boolean' },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id as string | undefined;
    return this.storage.upload(
      {
        fileName: file.originalname,
        mimeType: file.mimetype,
        buffer:   file.buffer,
        key:      dto.key,
        isPublic: dto.isPublic,
        metadata: dto.metadata,
      },
      userId,
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────

  @Get()
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "List the authenticated user's uploaded files" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const userId = (req as any).user.id as string;
    return this.storage.listFiles(userId, +page, +limit);
  }

  // ── Get one ───────────────────────────────────────────────────────────────

  @Get(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get file metadata' })
  async getOne(@Param('id') id: string) {
    return this.storage.getFile(id);
  }

  // ── Signed URL ────────────────────────────────────────────────────────────

  @Get(':id/signed-url')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Generate a temporary signed URL for private file access' })
  @ApiQuery({ name: 'expiresIn', required: false, type: Number, description: 'Seconds until expiry (default 3600)' })
  async signedUrl(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ) {
    return this.storage.getSignedUrl(id, expiresIn ? +expiresIn : undefined);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  @Delete(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file from storage and remove the record' })
  async remove(@Param('id') id: string) {
    await this.storage.delete(id);
  }
}
