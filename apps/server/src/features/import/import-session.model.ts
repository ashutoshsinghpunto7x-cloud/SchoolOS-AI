import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ImportType = 'students' | 'teachers' | 'fees' | 'admissions';

export type ImportStatus =
  | 'uploading'
  | 'parsing'
  | 'validating'
  | 'preview'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled_back';

export type ImportRowStatus = 'pending' | 'valid' | 'warning' | 'error' | 'imported' | 'skipped';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IImportRowError {
  field: string;
  message: string;
  code: string;
}

export interface IImportTimelineEvent {
  event: 'uploaded' | 'validated' | 'confirmed' | 'processing_started' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
  at: Date;
  note?: string;
}

// ── ImportSession ─────────────────────────────────────────────────────────────

export interface IImportSession extends Document {
  schoolId: string;
  createdBy: string;
  createdByName: string;
  importType: ImportType;
  status: ImportStatus;

  // File metadata
  originalFileName: string;
  fileSize: number;
  mimeType: string;

  // Column mapping: sourceHeader → schemaField
  mapping: Record<string, string>;

  // Stats
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  importedRows: number;
  skippedRows: number;

  // Rollback support — IDs of successfully created records
  importedIds: string[];

  // Timeline of events within this session
  timeline: IImportTimelineEvent[];

  // Top-level error message (session-level failure)
  errorSummary?: string;

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  rolledBackAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ── ImportRow ─────────────────────────────────────────────────────────────────

export interface IImportRow {
  _id: string;
  sessionId: string;
  schoolId: string;
  rowNumber: number;

  /** Original data as parsed from the file */
  rawData: Record<string, unknown>;

  /** Data after column mapping applied */
  mappedData: Record<string, unknown>;

  status: ImportRowStatus;

  errors: IImportRowError[];
  warnings: IImportRowError[];

  /** _id of the domain record created during import */
  importedId?: string;

  createdAt: Date;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const importRowErrorSchema = new Schema<IImportRowError>(
  {
    field: { type: String, required: true },
    message: { type: String, required: true },
    code: { type: String, required: true },
  },
  { _id: false }
);

const importTimelineEventSchema = new Schema<IImportTimelineEvent>(
  {
    event: { type: String, required: true },
    at: { type: Date, required: true },
    note: { type: String },
  },
  { _id: false }
);

const importSessionSchema = new Schema<IImportSession>(
  {
    schoolId: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdByName: { type: String, required: true },
    importType: {
      type: String,
      enum: ['students', 'teachers', 'fees', 'admissions'],
      required: true,
    },
    status: {
      type: String,
      enum: ['uploading', 'parsing', 'validating', 'preview', 'confirmed', 'processing', 'completed', 'failed', 'cancelled', 'rolled_back'],
      default: 'uploading',
    },

    originalFileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },

    mapping: { type: Schema.Types.Mixed, default: {} },

    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    warningRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    skippedRows: { type: Number, default: 0 },

    importedIds: { type: [String], default: [] },

    timeline: { type: [importTimelineEventSchema], default: [] },

    errorSummary: { type: String },

    startedAt: { type: Date },
    completedAt: { type: Date },
    rolledBackAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

importSessionSchema.index({ schoolId: 1, createdAt: -1 });
importSessionSchema.index({ schoolId: 1, status: 1 });
importSessionSchema.index({ schoolId: 1, importType: 1 });

const importRowSchema = new Schema<IImportRow>(
  {
    sessionId: { type: String, required: true },
    schoolId: { type: String, required: true },
    rowNumber: { type: Number, required: true },
    rawData: { type: Schema.Types.Mixed, required: true },
    mappedData: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'valid', 'warning', 'error', 'imported', 'skipped'],
      default: 'pending',
    },
    errors: { type: [importRowErrorSchema], default: [] },
    warnings: { type: [importRowErrorSchema], default: [] },
    importedId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

importRowSchema.index({ sessionId: 1, rowNumber: 1 });
importRowSchema.index({ sessionId: 1, status: 1 });

export const ImportSession = mongoose.model<IImportSession>('ImportSession', importSessionSchema);
export const ImportRow = mongoose.model<IImportRow>('ImportRow', importRowSchema);
