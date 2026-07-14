import mongoose, { Document, Schema } from 'mongoose';
import { ImportType } from './import-session.model';

export interface IImportMappingTemplate extends Document {
  schoolId: string;
  importType: ImportType;
  /** Normalized, sorted, joined header list — identifies "the same file shape"
   *  so a re-upload of the same export auto-reuses this mapping. */
  headerSignature: string;
  mapping: Record<string, string>;
  /** Set for a user-named, reusable template (e.g. "CBSE Template"); absent
   *  for the auto-remembered "last mapping used for this shape" entry. */
  name?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const importMappingTemplateSchema = new Schema<IImportMappingTemplate>(
  {
    schoolId: { type: String, required: true, index: true },
    importType: {
      type: String,
      enum: ['students', 'teachers', 'fees', 'admissions', 'attendance'],
      required: true,
    },
    headerSignature: { type: String, required: true },
    mapping: { type: Schema.Types.Mixed, required: true },
    name: { type: String, trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

// One auto-remembered entry per exact header shape; named templates aren't
// constrained by this (a school may want several named templates for the
// same shape), so only apply the unique index to unnamed (auto) entries.
importMappingTemplateSchema.index(
  { schoolId: 1, importType: 1, headerSignature: 1 },
  { unique: true, partialFilterExpression: { name: { $exists: false } } },
);
importMappingTemplateSchema.index({ schoolId: 1, importType: 1, name: 1 });

export const ImportMappingTemplate = mongoose.model<IImportMappingTemplate>(
  'ImportMappingTemplate',
  importMappingTemplateSchema,
);

/** Order-independent, case/whitespace-insensitive signature for a header set —
 *  so column reordering between exports still counts as "the same shape." */
export function computeHeaderSignature(headers: string[]): string {
  return headers
    .map((h) => h.trim().toLowerCase().replace(/[\s_\-.]+/g, ''))
    .filter(Boolean)
    .sort()
    .join('|');
}
