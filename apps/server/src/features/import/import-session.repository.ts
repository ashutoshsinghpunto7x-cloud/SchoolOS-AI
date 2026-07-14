import {
  ImportSession, ImportRow,
  IImportSession, IImportRow,
  ImportStatus, ImportRowStatus, ImportType, IImportTimelineEvent,
} from './import-session.model';

// ── Session repository ────────────────────────────────────────────────────────

export interface CreateSessionPayload {
  schoolId: string;
  createdBy: string;
  createdByName: string;
  importType: ImportType;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ListSessionsOptions {
  page?: number;
  limit?: number;
  importType?: ImportType;
  status?: ImportStatus;
}

export interface PaginatedSessions {
  data: IImportSession[];
  meta: { page: number; limit: number; total: number };
}

export const importSessionRepository = {
  async create(payload: CreateSessionPayload): Promise<IImportSession> {
    return ImportSession.create({
      ...payload,
      status: 'uploading',
      timeline: [{ event: 'uploaded', at: new Date() }],
    });
  },

  async findById(id: string, schoolId: string): Promise<IImportSession | null> {
    return ImportSession.findOne({ _id: id, schoolId }).lean<IImportSession>();
  },

  async findAll(schoolId: string, opts: ListSessionsOptions = {}): Promise<PaginatedSessions> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { schoolId };
    if (opts.importType) filter.importType = opts.importType;
    if (opts.status) filter.status = opts.status;

    const [data, total] = await Promise.all([
      ImportSession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IImportSession[]>(),
      ImportSession.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
  },

  async updateStatus(
    id: string,
    schoolId: string,
    status: ImportStatus,
    extra: Partial<Pick<IImportSession, 'totalRows' | 'validRows' | 'warningRows' | 'failedRows' | 'importedRows' | 'skippedRows' | 'duplicateRows' | 'duplicateStrategy' | 'mapping' | 'headerSignature' | 'errorSummary' | 'startedAt' | 'completedAt' | 'rolledBackAt' | 'detectedNewClasses'>> = {}
  ): Promise<IImportSession | null> {
    return ImportSession.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { status, ...extra } },
      { new: true }
    ).lean<IImportSession>();
  },

  async pushTimelineEvent(id: string, schoolId: string, event: IImportTimelineEvent): Promise<void> {
    await ImportSession.updateOne(
      { _id: id, schoolId },
      { $push: { timeline: event } }
    );
  },

  async appendImportedId(id: string, schoolId: string, recordId: string): Promise<void> {
    await ImportSession.updateOne(
      { _id: id, schoolId },
      { $push: { importedIds: recordId } }
    );
  },

  async incrementImportedRows(id: string, schoolId: string, count = 1): Promise<void> {
    await ImportSession.updateOne(
      { _id: id, schoolId },
      { $inc: { importedRows: count } }
    );
  },
};

// ── Row repository ────────────────────────────────────────────────────────────

export interface CreateRowsPayload {
  sessionId: string;
  schoolId: string;
  rows: Array<{
    rowNumber: number;
    rawData: Record<string, unknown>;
    mappedData: Record<string, unknown>;
    status: ImportRowStatus;
    errors: IImportRow['errors'];
    warnings: IImportRow['warnings'];
    duplicateOf?: string;
  }>;
}

export interface ListRowsOptions {
  page?: number;
  limit?: number;
  status?: ImportRowStatus;
}

export interface PaginatedRows {
  data: IImportRow[];
  meta: { page: number; limit: number; total: number };
}

export const importRowRepository = {
  async bulkCreate(payload: CreateRowsPayload): Promise<void> {
    const docs = payload.rows.map((r) => ({
      sessionId: payload.sessionId,
      schoolId: payload.schoolId,
      ...r,
    }));
    await ImportRow.insertMany(docs, { ordered: false });
  },

  /** Unpaginated — used internally for remapping/re-validation and error-report export,
   *  never returned directly from an HTTP handler as-is. */
  async findAllBySession(sessionId: string, status?: ImportRowStatus): Promise<IImportRow[]> {
    const filter: Record<string, unknown> = { sessionId };
    if (status) filter.status = status;
    return ImportRow.find(filter).sort({ rowNumber: 1 }).lean<IImportRow[]>();
  },

  async findBySession(sessionId: string, opts: ListRowsOptions = {}): Promise<PaginatedRows> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { sessionId };
    if (opts.status) filter.status = opts.status;

    const [data, total] = await Promise.all([
      ImportRow.find(filter).sort({ rowNumber: 1 }).skip(skip).limit(limit).lean<IImportRow[]>(),
      ImportRow.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
  },

  async updateRowStatus(
    sessionId: string,
    rowNumber: number,
    status: ImportRowStatus,
    importedId?: string,
    /** When a row fails during processing, surface why — otherwise the failure
     *  is invisible in the UI (status flips to 'error' with an empty reason). */
    processingError?: string
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (importedId) update.importedId = importedId;
    if (processingError) {
      update.errors = [{ field: 'processing', message: processingError, code: 'processing_failed' }];
    }
    await ImportRow.updateOne({ sessionId, rowNumber }, { $set: update });
  },

  async deleteBySession(sessionId: string): Promise<void> {
    await ImportRow.deleteMany({ sessionId });
  },

  /** Bulk-applies a duplicate-resolution strategy to every row that matched an
   *  existing record — the session-wide default set from the preview screen. */
  async setDuplicateActionForSession(sessionId: string, action: 'skip' | 'update' | 'create'): Promise<number> {
    const result = await ImportRow.updateMany(
      { sessionId, duplicateOf: { $exists: true, $ne: null } },
      { $set: { duplicateAction: action } },
    );
    return result.modifiedCount;
  },

  async countByStatus(sessionId: string): Promise<Record<string, number>> {
    const agg = await ImportRow.aggregate([
      { $match: { sessionId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(agg.map((a: { _id: string; count: number }) => [a._id, a.count]));
  },
};
