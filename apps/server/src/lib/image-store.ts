import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

/**
 * Persists textbook page images (for picture-based question generation — see
 * question-extraction.service.ts's figure detection) via MongoDB GridFS rather than embedding
 * base64 on the owning document. A single teacher photo already runs 1-5MB (see
 * aiImageUploadMiddleware's 15MB cap) and a chapter capture holds many pages in one job/source —
 * base64-embedding those directly on a Mongo document (the pattern used elsewhere for small
 * attachments, see image-upload.ts) would blow past MongoDB's 16MB per-document limit fast.
 * GridFS chunks large files across a dedicated collection instead, referenced by a stable
 * ObjectId, while staying on the same Mongo cluster — no S3/Cloudinary account needed, and no new
 * native dependency (GridFSBucket is pure wire-protocol, shipped with the `mongodb` driver that
 * mongoose already depends on) — unlike the pdf-parse/@napi-rs/canvas native binding that took
 * production down for ~15h (see the "12c00ee" lesson referenced elsewhere in this feature).
 */

const BUCKET_NAME = 'question_bank_images';

function getBucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not ready — cannot access image store.');
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export interface StoredImageMeta {
  schoolId: string;
  contentType: string;
}

/** Saves an image buffer to GridFS, tagged with the owning school for later access checks. Returns the new file's id (hex string) to store as a reference elsewhere (ChapterPage.pageImageFileId, etc). */
export async function saveImage(buffer: Buffer, meta: StoredImageMeta): Promise<string> {
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(`${meta.schoolId}-${Date.now()}`, {
      contentType: meta.contentType,
      metadata: { schoolId: meta.schoolId },
    });
    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id.toHexString()));
  });
}

/** Reads back an image's bytes + content type. Returns null if the id doesn't exist (e.g. already deleted) rather than throwing, so callers can degrade gracefully (skip the image) instead of failing a whole paper/worksheet render over one missing figure. `schoolId` is checked against the stored tag so one school's upload can never be fetched via another school's id — the same tenant boundary every other question-bank read enforces. */
export async function readImage(fileId: string, schoolId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!ObjectId.isValid(fileId)) return null;
  const bucket = getBucket();
  const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
  const file = files[0];
  if (!file || file.metadata?.schoolId !== schoolId) return null;

  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    bucket.openDownloadStream(new ObjectId(fileId))
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: file.contentType ?? 'image/jpeg' }));
  });
}

/** Best-effort delete — swallows "not found" rather than throwing, since callers use this to clean up on source-deletion and a missing file (already-cleaned, race, etc.) shouldn't block the rest of that deletion. */
export async function deleteImage(fileId: string): Promise<void> {
  if (!ObjectId.isValid(fileId)) return;
  try {
    await getBucket().delete(new ObjectId(fileId));
  } catch {
    // already gone — fine
  }
}
