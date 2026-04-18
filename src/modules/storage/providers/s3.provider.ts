/**
 * AWS S3 Storage Provider
 *
 * Install the SDK before using:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=us-east-1
 *   S3_BUCKET=your-bucket-name
 *   S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com  (optional CDN override)
 *
 * Docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
 */

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// TODO: uncomment after installing SDKs
// import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
export class S3Provider implements IStorageProvider {
  readonly name: StorageProviderName = 's3';
  private readonly logger = new Logger(S3Provider.name, { timestamp: true });

  // TODO: private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    // TODO:
    // this.client = new S3Client({
    //   region: config.getOrThrow('AWS_REGION'),
    //   credentials: {
    //     accessKeyId:     config.getOrThrow('AWS_ACCESS_KEY_ID'),
    //     secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
    //   },
    // });
  }

  async upload(params: UploadFileParams): Promise<UploadResult> {
    // TODO:
    // const bucket = this.config.getOrThrow('S3_BUCKET');
    // const key    = params.key ?? `uploads/${randomUUID()}/${params.fileName}`;
    //
    // await this.client.send(new PutObjectCommand({
    //   Bucket:      bucket,
    //   Key:         key,
    //   Body:        params.buffer,
    //   ContentType: params.mimeType,
    //   ACL:         params.isPublic ? 'public-read' : 'private',
    //   Metadata:    params.metadata,
    // }));
    //
    // const baseUrl  = this.config.get('S3_PUBLIC_URL') ?? `https://${bucket}.s3.amazonaws.com`;
    // const url      = params.isPublic ? `${baseUrl}/${key}` : '';   // private → use getSignedUrl
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
    // const bucket = this.config.getOrThrow('S3_BUCKET');
    // await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: params.key }));
    throw new NotImplementedException('Implement delete()');
  }

  async getSignedUrl(params: GetSignedUrlParams): Promise<SignedUrlResult> {
    // TODO:
    // const bucket     = this.config.getOrThrow('S3_BUCKET');
    // const expiresIn  = params.expiresIn ?? 3600;
    // const command    = new GetObjectCommand({ Bucket: bucket, Key: params.key });
    // const url        = await getSignedUrl(this.client, command, { expiresIn });
    // return { url, expiresAt: new Date(Date.now() + expiresIn * 1_000) };
    throw new NotImplementedException('Implement getSignedUrl()');
  }
}
