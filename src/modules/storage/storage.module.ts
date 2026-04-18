import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { S3Provider } from './providers/s3.provider';
import { R2Provider } from './providers/r2.provider';
import { LocalProvider } from './providers/local.provider';

@Module({
  imports: [
    PrismaModule,
    // Files are kept in memory so the provider can stream them directly to S3/R2/disk.
    // Set limits to guard against oversized uploads.
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  ],
  controllers: [StorageController],
  providers: [
    StorageService,
    // All providers registered; active one selected by STORAGE_PROVIDER env var.
    // local — works out of the box, no credentials needed
    // s3    — requires @aws-sdk/client-s3 + AWS credentials
    // r2    — requires @aws-sdk/client-s3 + Cloudflare R2 credentials
    S3Provider,
    R2Provider,
    LocalProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}
