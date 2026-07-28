import { ApiKey, type IApiKey } from './api-key.model';

export const apiKeyRepository = {
  async create(data: Partial<IApiKey>): Promise<IApiKey> {
    return ApiKey.create(data);
  },

  // schoolId is part of the query itself (not just checked after the fact by
  // the caller) so tenant isolation doesn't depend on every call site
  // remembering to re-check it.
  async findById(id: string, schoolId: string): Promise<IApiKey | null> {
    return ApiKey.findOne({ _id: id, schoolId }).lean<IApiKey>();
  },

  async findByPrefix(keyPrefix: string): Promise<IApiKey | null> {
    return ApiKey.findOne({ keyPrefix, enabled: true }).lean<IApiKey>();
  },

  async findBySchool(schoolId: string): Promise<IApiKey[]> {
    return ApiKey.find({ schoolId }).sort({ createdAt: -1 }).lean<IApiKey[]>();
  },

  async revoke(id: string): Promise<void> {
    await ApiKey.findByIdAndUpdate(id, { $set: { enabled: false } });
  },

  async updateLastUsed(id: string): Promise<void> {
    await ApiKey.findByIdAndUpdate(id, { $set: { lastUsedAt: new Date() } });
  },

  async delete(id: string): Promise<void> {
    await ApiKey.findByIdAndDelete(id);
  },
};
