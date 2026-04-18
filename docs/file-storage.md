# File Storage Module

Provider-agnostic file storage supporting **local disk** (works out of the box), **AWS S3**, and **Cloudflare R2**. Swap providers with a single environment variable. Every upload is persisted to Postgres.

---

## Quick Start

### 1. Set the active provider

```env
# .env
STORAGE_PROVIDER=local   # local | s3 | r2
```

`local` works immediately with no credentials — ideal for development.

### 2. (Cloud providers) Install the SDK

```bash
# S3 or R2 — both use the same AWS SDK
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 3. Add credentials to `.env`

See the [Environment Variables](#environment-variables) section below.

### 4. Fill in the TODOs (cloud providers only)

| Provider | File |
|---|---|
| AWS S3 | `src/modules/storage/providers/s3.provider.ts` |
| Cloudflare R2 | `src/modules/storage/providers/r2.provider.ts` |
| Local | `src/modules/storage/providers/local.provider.ts` — **fully implemented** |

---

## Environment Variables

### Local
```env
STORAGE_LOCAL_PATH=./uploads
STORAGE_LOCAL_BASE_URL=http://localhost:3000/uploads
```

Serve the uploads folder as static assets in `main.ts`:
```typescript
app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
```

### AWS S3
```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com   # optional CDN override
```

### Cloudflare R2
```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=your-bucket-name
R2_PUBLIC_URL=https://pub-xxx.r2.dev   # optional — enable public access in Cloudflare dashboard
```

---

## REST API

All endpoints are under `/api/v1/storage` and require authentication.

### Upload a file

```
POST /api/v1/storage/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=@photo.jpg
isPublic=true
```

Response:
```json
{
  "id": "clx...",
  "provider": "local",
  "key": "uuid/photo.jpg",
  "url": "http://localhost:3000/uploads/uuid/photo.jpg",
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 204800
}
```

### List files

```
GET /api/v1/storage?page=1&limit=20
```

### Get file metadata

```
GET /api/v1/storage/:id
```

### Generate a signed URL (private files)

```
GET /api/v1/storage/:id/signed-url?expiresIn=3600
```

Returns:
```json
{
  "url": "https://bucket.s3.amazonaws.com/uuid/photo.jpg?X-Amz-Signature=...",
  "expiresAt": "2026-04-18T13:00:00.000Z"
}
```

### Delete a file

```
DELETE /api/v1/storage/:id
```
`204 No Content` — deletes from both the provider and the database.

---

## Programmatic Usage

Inject `StorageService` anywhere in your application:

```typescript
import { StorageService } from '../storage';

constructor(private readonly storage: StorageService) {}

// Upload from a Multer file
const result = await this.storage.upload({
  fileName: file.originalname,
  mimeType: file.mimetype,
  buffer:   file.buffer,
  isPublic: true,
}, userId);

// Get a temporary signed URL
const { url } = await this.storage.getSignedUrl(result.id, 600); // 10 min

// Delete
await this.storage.delete(result.id);
```

---

## Pairing with the Media Module

`MediaModule` (Sharp) and `StorageModule` are complementary:

```typescript
// Process image with Sharp → then store the result
const processed = await this.media.processImage(file, {
  width: 1200,
  format: 'webp',
  quality: 85,
});

const stored = await this.storage.upload({
  fileName: 'photo.webp',
  mimeType: 'image/webp',
  buffer:   processed.buffer,
  isPublic: true,
});

// Generate thumbnails and store each size
const thumbs = await this.media.generateThumbnails(file, [
  { name: 'sm', width: 100 },
  { name: 'md', width: 400 },
]);

for (const thumb of thumbs) {
  await this.storage.upload({
    fileName: `photo-${thumb.name}.webp`,
    mimeType: 'image/webp',
    buffer:   thumb.buffer,
    key:      `thumbnails/${userId}/${thumb.name}.webp`,
    isPublic: true,
  });
}
```

---

## Database Schema

```prisma
model StoredFile {
  id       String  @id @default(cuid())
  userId   String?
  provider String  // 's3' | 'r2' | 'local'
  key      String  // storage path/key
  url      String
  fileName String
  mimeType String?
  size     Int?    // bytes
  metadata Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## S3 vs R2 — Key Differences

| | AWS S3 | Cloudflare R2 |
|---|---|---|
| Egress fees | Yes | **No egress fees** |
| ACL support | Yes | No — configure via Cloudflare dashboard |
| Endpoint | AWS regional | `https://<accountId>.r2.cloudflarestorage.com` |
| SDK | `@aws-sdk/client-s3` | Same `@aws-sdk/client-s3` |
| Region | Any AWS region | `auto` |

---

## Adding a New Provider

1. Create `src/modules/storage/providers/myprovider.provider.ts` implementing `IStorageProvider`
2. Add `'myprovider'` to `StorageProviderName` in `storage.types.ts`
3. Register in `StorageModule` providers array
4. Inject in `StorageService` and add a case to `resolveProvider()`
5. Set `STORAGE_PROVIDER=myprovider` in `.env`
