import { Asset, IAsset, AssetCategory, AssetStatus } from './asset.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindAssetsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: AssetCategory;
  status?: AssetStatus;
}

export interface PaginatedAssets {
  records: IAsset[];
  total: number;
  page: number;
  limit: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const assetRepository = {
  async create(data: Partial<IAsset>): Promise<IAsset> {
    const asset = new Asset(data);
    return asset.save();
  },

  async findById(id: string, schoolId: string): Promise<IAsset | null> {
    return Asset.findOne({ _id: id, schoolId, isDeleted: false }).lean<IAsset>();
  },

  async findAll(schoolId: string, opts: FindAssetsOptions = {}): Promise<PaginatedAssets> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { assetId: regex }];
    }
    if (opts.category) query.category = opts.category;
    if (opts.status)   query.status   = opts.status;

    const [records, total] = await Promise.all([
      Asset.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean<IAsset[]>(),
      Asset.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async countUnderRepair(schoolId: string): Promise<number> {
    return Asset.countDocuments({ schoolId, isDeleted: false, status: 'under_repair' });
  },

  async update(id: string, schoolId: string, data: Partial<IAsset> & { updatedBy?: string }): Promise<IAsset | null> {
    return Asset.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IAsset>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Asset.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
