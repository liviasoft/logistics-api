import {
  DeleteFileParams,
  GetSignedUrlParams,
  SignedUrlResult,
  StorageProviderName,
  UploadFileParams,
  UploadResult,
} from '../storage.types';

/**
 * IStorageProvider
 *
 * Every provider (S3, R2, local) implements this interface.
 * StorageService depends only on this interface — swap providers by
 * changing STORAGE_PROVIDER in your environment.
 */
export interface IStorageProvider {
  readonly name: StorageProviderName;

  /**
   * Upload a file and return its permanent or public URL.
   *
   * S3/R2: PutObjectCommand → public URL or pre-signed URL
   * local: write to disk → local path URL
   */
  upload(params: UploadFileParams): Promise<UploadResult>;

  /**
   * Permanently delete a stored file.
   */
  delete(params: DeleteFileParams): Promise<void>;

  /**
   * Generate a temporary signed URL for private file access.
   * Local provider returns the same public URL with no expiry.
   *
   * S3/R2: GetObjectCommand pre-signed URL
   */
  getSignedUrl(params: GetSignedUrlParams): Promise<SignedUrlResult>;
}
