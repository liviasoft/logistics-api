/**
 * Local Disk Storage Provider
 *
 * No dependencies — uses Node's built-in fs/promises.
 * Useful for development and self-hosted deployments.
 *
 * Required env vars:
 *   STORAGE_LOCAL_PATH=./uploads        (relative to project root)
 *   STORAGE_LOCAL_BASE_URL=http://localhost:3000/uploads
 *
 * Important:
 *   Serve the uploads folder as static assets in main.ts:
 *     app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
 *   Or via nginx in production.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import {
  DeleteFileParams,
  GetSignedUrlParams,
  SignedUrlResult,
  StorageProviderName,
  UploadFileParams,
  UploadResult,
} from '../storage.types';

@Injectable()
export class LocalProvider implements IStorageProvider {
  readonly name: StorageProviderName = 'local';
  private readonly logger = new Logger(LocalProvider.name, { timestamp: true });
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.basePath = config.get('STORAGE_LOCAL_PATH', './uploads');
    this.baseUrl  = config.get('STORAGE_LOCAL_BASE_URL', 'http://localhost:3000/uploads');
  }

  async upload(params: UploadFileParams): Promise<UploadResult> {
    const key      = params.key ?? `${randomUUID()}/${params.fileName}`;
    const fullPath = join(this.basePath, key);

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.buffer);

    const url = `${this.baseUrl}/${key}`;

    return {
      id:       '',
      provider: this.name,
      key,
      url,
      fileName: params.fileName,
      mimeType: params.mimeType,
      size:     params.buffer.length,
      raw:      { path: fullPath },
    };
  }

  async delete(params: DeleteFileParams): Promise<void> {
    const fullPath = join(this.basePath, params.key);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }

  async getSignedUrl(params: GetSignedUrlParams): Promise<SignedUrlResult> {
    // Local files are served as static assets — no signing needed.
    const url       = `${this.baseUrl}/${params.key}`;
    const expiresIn = params.expiresIn ?? 3600;
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1_000) };
  }
}
