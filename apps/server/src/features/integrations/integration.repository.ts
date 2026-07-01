import { Integration, SyncLog, type IIntegration, type ISyncLog, type IntegrationStatus, type SyncStatus, type SyncType } from './integration.model';

// ── Integration Repository ────────────────────────────────────────────────────

export const integrationRepository = {
  async create(data: Partial<IIntegration>): Promise<IIntegration> {
    return Integration.create(data);
  },

  async findById(id: string): Promise<IIntegration | null> {
    return Integration.findById(id).lean<IIntegration>();
  },

  async findAll(schoolId: string, filters: { providerType?: string; status?: string; enabled?: boolean } = {}): Promise<IIntegration[]> {
    const query: Record<string, unknown> = { schoolId };
    if (filters.providerType) query.providerType = filters.providerType;
    if (filters.status) query.status = filters.status;
    if (filters.enabled !== undefined) query.enabled = filters.enabled;
    return Integration.find(query).sort({ createdAt: -1 }).lean<IIntegration[]>();
  },

  async update(id: string, data: Partial<IIntegration>): Promise<IIntegration | null> {
    return Integration.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean<IIntegration>();
  },

  async updateStatus(id: string, status: IntegrationStatus, error?: string): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (error !== undefined) update.lastSyncError = error || null;
    await Integration.findByIdAndUpdate(id, { $set: update });
  },

  async updateAfterSync(id: string, status: 'success' | 'failure' | 'partial', error?: string, nextSyncAt?: Date): Promise<void> {
    const now = new Date();
    await Integration.findByIdAndUpdate(id, {
      $set: {
        lastSyncAt: now,
        lastSyncStatus: status,
        lastSyncError: error ?? null,
        status: status === 'success' ? 'connected' : 'error',
        ...(nextSyncAt ? { nextSyncAt } : {}),
      },
    });
  },

  async pushTimeline(id: string, event: { event: string; note?: string; actorId?: string; actorName?: string }): Promise<void> {
    await Integration.findByIdAndUpdate(id, {
      $push: { timeline: { ...event, at: new Date() } },
    });
  },

  async delete(id: string): Promise<void> {
    await Integration.findByIdAndDelete(id);
  },

  async countBySchool(schoolId: string): Promise<{ total: number; connected: number; error: number }> {
    const [total, connected, error] = await Promise.all([
      Integration.countDocuments({ schoolId }),
      Integration.countDocuments({ schoolId, status: 'connected' }),
      Integration.countDocuments({ schoolId, status: 'error' }),
    ]);
    return { total, connected, error };
  },

  // Find integrations due for scheduled sync
  async findDueForSync(): Promise<IIntegration[]> {
    const now = new Date();
    return Integration.find({
      enabled: true,
      status: { $in: ['connected', 'error'] },
      nextSyncAt: { $lte: now },
      'config.syncInterval': { $gt: 0 },
    }).lean<IIntegration[]>();
  },
};

// ── SyncLog Repository ────────────────────────────────────────────────────────

export const syncLogRepository = {
  async create(data: {
    integrationId: string;
    schoolId: string;
    providerKey: string;
    syncType: SyncType;
  }): Promise<ISyncLog> {
    const doc = await SyncLog.create({ ...data, startedAt: new Date(), status: 'running', recordsSynced: 0, recordsFailed: 0, errors: [] });
    return doc.toObject() as unknown as ISyncLog;
  },

  async complete(id: string, result: { status: SyncStatus; recordsSynced: number; recordsFailed: number; errors: string[]; metadata?: Record<string, unknown> }): Promise<void> {
    await SyncLog.findByIdAndUpdate(id, {
      $set: { ...result, completedAt: new Date() },
    });
  },

  async findByIntegration(integrationId: string, page: number, limit: number): Promise<{ data: ISyncLog[]; total: number }> {
    const [data, total] = await Promise.all([
      SyncLog.find({ integrationId }).sort({ startedAt: -1 }).skip((page - 1) * limit).limit(limit).lean<ISyncLog[]>(),
      SyncLog.countDocuments({ integrationId }),
    ]);
    return { data, total };
  },

  async findBySchool(schoolId: string, page: number, limit: number): Promise<{ data: ISyncLog[]; total: number }> {
    const [data, total] = await Promise.all([
      SyncLog.find({ schoolId }).sort({ startedAt: -1 }).skip((page - 1) * limit).limit(limit).lean<ISyncLog[]>(),
      SyncLog.countDocuments({ schoolId }),
    ]);
    return { data, total };
  },
};
