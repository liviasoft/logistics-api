// =============================================================================
// Normalised file storage types — shared across all providers
// =============================================================================

export type StorageProviderName = 's3' | 'r2' | 'local';

// ─── Input params ─────────────────────────────────────────────────────────────

export interface UploadFileParams {
  /** Original filename */
  fileName: string;
  /** MIME type e.g. 'image/jpeg', 'application/pdf' */
  mimeType: string;
  /** File content as Buffer */
  buffer: Buffer;
  /** Target path/key within the bucket. Defaults to a generated UUID path. */
  key?: string;
  /** Set to true to allow public read access */
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

export interface DeleteFileParams {
  /** The storage key returned from upload */
  key: string;
}

export interface GetSignedUrlParams {
  key: string;
  /** Expiry in seconds. Defaults to 3600 (1 hour). */
  expiresIn?: number;
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  /** Your internal file ID (cuid from Postgres) */
  id: string;
  provider: StorageProviderName;
  /** Storage key (path within bucket/folder) */
  key: string;
  /** Public URL or pre-signed URL */
  url: string;
  fileName: string;
  mimeType: string;
  /** File size in bytes */
  size: number;
  raw: unknown;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}
