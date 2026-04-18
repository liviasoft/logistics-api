export interface ProcessOptions {
  /** Target width in pixels. Height scales proportionally unless both are set. */
  width?: number;
  /** Target height in pixels. */
  height?: number;
  /** Output format. Defaults to the input format. */
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';
  /** Quality 1–100 (jpeg/webp/avif). Default: 80. */
  quality?: number;
  /** Whether to strip EXIF metadata. Default: true. */
  stripMetadata?: boolean;
  /** Fit strategy when both width and height are set. */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ProcessResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  savedBytes: number;
}

export interface UploadedFileInfo {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
