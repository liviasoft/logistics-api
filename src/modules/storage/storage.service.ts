import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { S3Provider } from './providers/s3.provider';
import { R2Provider } from './providers/r2.provider';
import { LocalProvider } from './providers/local.provider';
import {
  GetSignedUrlParams,
  SignedUrlResult,
  StorageProviderName,
  UploadFileParams,
  UploadResult,
} from './storage.types';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name, { timestamp: true });
  private readonly provider: IStorageProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly s3: S3Provider,
    private readonly r2: R2Provider,
    private readonly local: LocalProvider,
  ) {
    const name = this.config.get<StorageProviderName>('STORAGE_PROVIDER', 'local');
    this.provider = this.resolveProvider(name);
    this.logger.log(`Active storage provider: ${this.provider.name}`);
  }

  // ── Provider ──────────────────────────────────────────────────────────────

  private resolveProvider(name: StorageProviderName): IStorageProvider {
    switch (name) {
      case 's3':    return this.s3;
      case 'r2':    return this.r2;
      case 'local': return this.local;
      default:
        throw new BadRequestException(`Unknown storage provider: ${name}`);
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async upload(params: UploadFileParams, userId?: string): Promise<UploadResult> {
    const result = await this.provider.upload(params);

    const record = await this.prisma.storedFile.create({
      data: {
        userId,
        provider: result.provider,
        key:      result.key,
        url:      result.url,
        fileName: result.fileName,
        mimeType: result.mimeType,
        size:     result.size,
        metadata: params.metadata ?? {},
      },
    });

    return { ...result, id: record.id };
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const record = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`File ${id} not found`);

    await this.provider.delete({ key: record.key });
    await this.prisma.storedFile.delete({ where: { id } });
  }

  // ── Signed URL ────────────────────────────────────────────────────────────

  async getSignedUrl(id: string, expiresIn?: number): Promise<SignedUrlResult> {
    const record = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`File ${id} not found`);

    return this.provider.getSignedUrl({ key: record.key, expiresIn });
  }

  // ── List / Get ────────────────────────────────────────────────────────────

  async listFiles(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.storedFile.count({ where: { userId } }),
      this.prisma.storedFile.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return { total, page, limit, items };
  }

  async getFile(id: string) {
    const record = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`File ${id} not found`);
    return record;
  }
}
