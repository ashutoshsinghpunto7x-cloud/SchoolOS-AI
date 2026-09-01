import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Cloudflare R2 is S3-API-compatible, so the standard AWS SDK works against
// it unmodified — just point `endpoint` at the account's R2 endpoint instead
// of AWS. This is the school's first real object-storage integration: every
// upload elsewhere in this app (see lib/image-upload.ts) is either a
// transient AI input or a base64 data URI embedded on the Mongo document,
// because no object storage was configured. Reception's visitor photos, ID
// proofs, résumés, and admission-form scans are the first assets that need
// to persist as actual files rather than bytes on a document, so this module
// exists to serve those (see the Reception Management Module SRD, docs/
// reception-management-module-srd.md, §11).

const REQUIRED_ENV = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'] as const;

function isConfigured(): boolean {
  return REQUIRED_ENV.every((key) => !!process.env[key]?.trim());
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isConfigured()) {
    throw new Error(
      'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
      'R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME to enable file uploads ' +
      '(visitor photos/ID proofs, résumés, admission-form scans).'
    );
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

/** Builds the public URL for a stored key. Requires R2_PUBLIC_URL (either the
 *  bucket's r2.dev dev URL or a custom domain mapped to the bucket) since R2
 *  buckets are private by default and have no public URL of their own. */
function publicUrlFor(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (!base) {
    throw new Error('R2_PUBLIC_URL is not set — cannot build a public URL for uploaded files.');
  }
  return `${base}/${key}`;
}

export interface UploadedFile {
  key: string;
  url: string;
}

/**
 * Uploads a buffer to R2 under `folder/` with a random filename (original
 * extension preserved), returning the object key and its public URL.
 * `folder` scopes storage by purpose, e.g. `visitors/photos`, `visitors/id-proofs`,
 * `candidates/resumes`, `admission-forms/documents` — mirrors the module split
 * in the Reception Management Module SRD.
 */
export async function uploadToR2(
  buffer: Buffer,
  contentType: string,
  folder: string,
  schoolId: string,
): Promise<UploadedFile> {
  const ext = contentType.split('/')[1]?.split('+')[0] || 'bin';
  const key = `${folder}/${schoolId}/${randomUUID()}.${ext}`;

  await getClient().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return { key, url: publicUrlFor(key) };
}

export async function deleteFromR2(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }));
}

export const r2Storage = { isConfigured, uploadToR2, deleteFromR2 };
