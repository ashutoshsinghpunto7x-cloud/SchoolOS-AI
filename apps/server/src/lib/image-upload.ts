import multer from 'multer';
import { ValidationError } from '../middlewares/errorHandler';

// Small images/attachments are stored as base64 data URIs directly on the
// Mongo document — this app runs on Vercel serverless (see app.ts), where a
// local uploads/ directory would not persist across invocations. No object
// storage (S3/Cloudinary) is configured, so this avoids needing new
// credentials while still working identically in dev and production.

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB — keeps documents well under Mongo's 16MB limit

export const imageUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new ValidationError('Only JPEG, PNG, WEBP, or GIF images are allowed.'));
  },
}).single('file');

const ALLOWED_DOC_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5 MB

export const documentUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_SIZE, files: 1 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_DOC_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new ValidationError('Only images, PDF, or Word documents are allowed.'));
  },
}).single('file');

/** Converts a multer in-memory file into a data URI string, ready to store directly on a document. */
export function fileToDataUri(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}
