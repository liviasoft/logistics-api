/**
 * Cloudflare R2 Storage Provider
 *
 * R2 is S3-compatible — uses the same AWS SDK.
 * Install the SDK before using:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *
 * Required env vars:
 *   R2_ACCOUNT_ID=...                   (Cloudflare account ID)
 *   R2_ACCESS_KEY_ID=...
 *   R2_SECRET_ACCESS_KEY=...
 *   R2_BUCKET=your-bucket-name
 *   R2_PUBLIC_URL=https://pub-xxx.r2.dev (optional — enable public access in Cloudflare)
 *
 * Docs: https://developers.cloudflare.com/r2/api/s3/api/
 *
 * Difference from S3 provider:
 *   - Endpoint: https://<accountId>.r2.cloudflarestorage.com
 *   - Region must be 'auto'
 *   - ACL is not supported — use R2 public bucket settings instead
 */

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// TODO: uncomment after installing SDKs
// import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
export class R2Provider implements IStorageProvider {
  readonly name: StorageProviderName = 'r2';
  private readonly logger = new Logger(R2Provider.name, { timestamp: true });

  // TODO: private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    // TODO:
    // const accountId = config.getOrThrow('R2_ACCOUNT_ID');
    // this.client = new S3Client({
    //   region:   'auto',
    //   endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    //   credentials: {
    //     accessKeyId:     config.getOrThrow('R2_ACCESS_KEY_ID'),
    //     secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
    //   },
    // });
  }

  async upload(params: UploadFileParams): Promise<UploadResult> {
    // TODO:
    // const bucket = this.config.getOrThrow('R2_BUCKET');
    // const key    = params.key ?? `uploads/${randomUUID()}/${params.fileName}`;
    //
    // await this.client.send(new PutObjectCommand({
    //   Bucket:      bucket,
    //   Key:         key,
    //   Body:        params.buffer,
    //   ContentType: params.mimeType,
    //   // Note: R2 does not support ACL — configure bucket public access in Cloudflare dashboard
    //   Metadata: params.metadata,
    // }));
    //
    // const publicUrl  = this.config.get('R2_PUBLIC_URL');
    // const url        = publicUrl ? `${publicUrl}/${key}` : '';
    //
    // return {
    //   id: '',
    //   provider: this.name,
    //   key,
    //   url,
    //   fileName: params.fileName,
    //   mimeType: params.mimeType,
    //   size:     params.buffer.length,
    //   raw:      { bucket, key },
    // };
    throw new NotImplementedException('Install @aws-sdk/client-s3 and implement upload()');
  }

  async delete(params: DeleteFileParams): Promise<void> {
    // TODO:
    // const bucket = this.config.getOrThrow('R2_BUCKET');
    // await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: params.key }));
    throw new NotImplementedException('Implement delete()');
  }

  async getSignedUrl(params: GetSignedUrlParams): Promise<SignedUrlResult> {
    // TODO:
    // const bucket    = this.config.getOrThrow('R2_BUCKET');
    // const expiresIn = params.expiresIn ?? 3600;
    // const command   = new GetObjectCommand({ Bucket: bucket, Key: params.key });
    // const url       = await getSignedUrl(this.client, command, { expiresIn });
    // return { url, expiresAt: new Date(Date.now() + expiresIn * 1_000) };
    throw new NotImplementedException('Implement getSignedUrl()');
  }
}
