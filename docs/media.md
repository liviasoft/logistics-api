# Media Processing (Sharp + Multer)

Image upload, validation, and processing via Sharp. Files are received as `multipart/form-data` and processed in memory — Sharp reads the buffer directly without touching disk.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/media/image` | Process and return image as binary |
| POST | `/api/v1/media/image/info` | Process and return JSON metadata only |
| POST | `/api/v1/media/image/thumbnails` | Generate multiple sizes from one upload |
| POST | `/api/v1/media/image/metadata` | Read EXIF/format metadata, no processing |

All endpoints require a valid Bearer token.

---

## Supported formats

- **Input**: JPEG, PNG, WebP, AVIF, GIF, TIFF
- **Output**: JPEG, PNG, WebP, AVIF, GIF
- **Max file size**: 10 MB

---

## Query parameters

All processing endpoints accept these query parameters:

| Param | Type | Default | Description |
|---|---|---|---|
| `width` | integer | — | Target width in pixels |
| `height` | integer | — | Target height in pixels (proportional if omitted) |
| `format` | string | source format | Output format: `jpeg`, `png`, `webp`, `avif`, `gif` |
| `quality` | integer | 80 | Compression quality 1–100 (jpeg/webp/avif) |
| `fit` | string | `cover` | Resize strategy when both dimensions set: `cover`, `contain`, `fill`, `inside`, `outside` |
| `stripMetadata` | boolean | `true` | Strip EXIF data and auto-rotate from orientation tag |

---

## API usage

### Process and return image binary

```bash
curl -X POST http://localhost:3001/api/v1/media/image \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg" \
  -o processed.webp \
  "?width=800&format=webp&quality=85"
```

Response headers include:
- `Content-Type: image/webp`
- `X-Original-Size: 2048576`
- `X-Saved-Bytes: 1024288`

### Get metadata only (JSON)

```bash
curl -X POST http://localhost:3001/api/v1/media/image/info \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg" \
  "?width=800&format=webp"
```

```json
{
  "success": true,
  "data": {
    "filename": "photo.jpg",
    "format": "webp",
    "width": 800,
    "height": 533,
    "size": 48210,
    "originalSize": 2048576,
    "savedBytes": 2000366,
    "compressionRatio": 42.49
  }
}
```

### Generate thumbnails

```bash
curl -X POST http://localhost:3001/api/v1/media/image/thumbnails \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg" \
  "?format=webp&quality=80"
```

```json
{
  "success": true,
  "data": {
    "thumb":  { "format": "webp", "width": 100, "height": 100, "size": 2048 },
    "small":  { "format": "webp", "width": 320, "height": 213, "size": 8192 },
    "medium": { "format": "webp", "width": 640, "height": 427, "size": 24576 },
    "large":  { "format": "webp", "width": 1280, "height": 853, "size": 65536 }
  }
}
```

---

## Using MediaService in your own module

### Basic processing

```typescript
import { MediaService } from '../media';

@Injectable()
export class AvatarsService {
  constructor(private readonly media: MediaService) {}

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    const result = await this.media.processImage(file, {
      width: 256,
      height: 256,
      format: 'webp',
      quality: 90,
      fit: 'cover',
      stripMetadata: true,
    });

    // result.buffer contains the processed image — upload to S3, save to disk, etc.
    return result;
  }
}
```

### Generate thumbnails programmatically

```typescript
const thumbnails = await this.media.generateThumbnails(file, [
  { name: 'avatar',   width: 64,   height: 64 },
  { name: 'profile',  width: 256,  height: 256 },
  { name: 'cover',    width: 1200, height: 400 },
], { format: 'webp', quality: 85 });

// thumbnails.avatar.buffer  — 64×64 WebP
// thumbnails.profile.buffer — 256×256 WebP
// thumbnails.cover.buffer   — 1200×400 WebP
```

### Read metadata without processing

```typescript
const metadata = await this.media.getMetadata(file.buffer);
console.log(metadata.width, metadata.height, metadata.format, metadata.exif);
```

---

## Integrating with S3 / Cloudflare R2 / MinIO

`MediaService` returns a `buffer` — pipe it to your object storage SDK:

```bash
npm install @aws-sdk/client-s3
```

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private s3 = new S3Client({ region: process.env.AWS_REGION });

  async upload(buffer: Buffer, key: string, contentType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000, immutable',
      }),
    );

    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  }
}
```

Usage in a controller:

```typescript
async uploadAvatar(
  @UploadedFile() file: Express.Multer.File,
  @Req() req: AuthenticatedRequest,
) {
  const result = await this.media.processImage(file, {
    width: 256, height: 256, format: 'webp', quality: 90,
  });

  const key = `avatars/${req.user.sub}.webp`;
  const url = await this.storage.upload(result.buffer, key, 'image/webp');

  return { url };
}
```

---

## Offloading to a queue for heavy processing

For large images or batch operations, process asynchronously via BullMQ:

```typescript
// 1. In your controller — enqueue immediately
@Post('upload')
async upload(@UploadedFile() file: Express.Multer.File) {
  // Store raw file to temp storage first (S3 staging bucket, etc.)
  const tempKey = await this.storage.uploadRaw(file.buffer, file.originalname);

  // Enqueue processing job
  await this.mediaQueue.add('process-image', {
    tempKey,
    operations: { width: 1280, format: 'webp', quality: 80 },
  });

  return { queued: true, tempKey };
}

// 2. In your processor — run Sharp in the background
@Processor(QUEUE_NAMES.MEDIA)
export class MediaProcessor extends WorkerHost {
  async process(job: Job) {
    const { tempKey, operations } = job.data;

    // Download raw file from staging
    const raw = await this.storage.download(tempKey);
    const file = { buffer: raw, size: raw.length, mimetype: 'image/jpeg' } as Express.Multer.File;

    // Process with Sharp
    const result = await this.media.processImage(file, operations);

    // Upload final result
    const finalKey = tempKey.replace('staging/', 'processed/');
    const url = await this.storage.upload(result.buffer, finalKey, `image/${result.format}`);

    return { url, ...result };
  }
}
```

---

## Customising file limits

The `MediaModule` uses `memoryStorage` with a 10 MB limit. To adjust:

```typescript
// src/modules/media/media.module.ts
MulterModule.register({
  storage: memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,  // 25 MB
    files: 5,                     // up to 5 files per request
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('Only images are allowed'), false);
    }
    cb(null, true);
  },
}),
```

For video or large files, switch to `diskStorage`:

```typescript
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';

MulterModule.register({
  storage: diskStorage({
    destination: './uploads/tmp',
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
}),
```

Then read the file from `file.path` instead of `file.buffer`.
