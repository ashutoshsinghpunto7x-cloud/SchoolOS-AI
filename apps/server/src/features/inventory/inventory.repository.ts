import { InventoryItem, IInventoryItem, InventoryCategory } from './inventory-item.model';
import { StockMovement, IStockMovement, StockMovementType, StockMovementRefType } from './stock-movement.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindInventoryItemsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: InventoryCategory;
  lowStock?: boolean;
}

export interface PaginatedInventoryItems {
  records: IInventoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInventoryItemData {
  schoolId: string;
  sku: string;
  itemName: string;
  category: InventoryCategory;
  qtyAvailable: number;
  minStockLevel: number;
  unitPrice?: number;
  preferredVendorId?: string;
  storageLocation?: string;
  createdBy: string;
}

export interface CreateStockMovementData {
  schoolId: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  qty: number;
  balanceAfter: number;
  refType: StockMovementRefType;
  refId?: string;
  issuedTo?: string;
  recordedBy: string;
  note?: string;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const inventoryRepository = {
  async create(data: CreateInventoryItemData): Promise<IInventoryItem> {
    const item = new InventoryItem(data);
    return item.save();
  },

  async findById(id: string, schoolId: string): Promise<IInventoryItem | null> {
    return InventoryItem.findOne({ _id: id, schoolId, isDeleted: false }).lean<IInventoryItem>();
  },

  async findByName(itemName: string, schoolId: string): Promise<IInventoryItem | null> {
    const regex = new RegExp(`^${itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    return InventoryItem.findOne({ schoolId, isDeleted: false, itemName: regex }).lean<IInventoryItem>();
  },

  async findAll(schoolId: string, opts: FindInventoryItemsOptions = {}): Promise<PaginatedInventoryItems> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ itemName: regex }, { sku: regex }];
    }
    if (opts.category) query.category = opts.category;
    if (opts.lowStock) query.$expr = { $lte: ['$qtyAvailable', '$minStockLevel'] };

    const [records, total] = await Promise.all([
      InventoryItem.find(query).sort({ itemName: 1 }).skip(skip).limit(limit).lean<IInventoryItem[]>(),
      InventoryItem.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async countLowStock(schoolId: string): Promise<number> {
    return InventoryItem.countDocuments({
      schoolId, isDeleted: false, $expr: { $lte: ['$qtyAvailable', '$minStockLevel'] },
    });
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<IInventoryItem> & { updatedBy?: string },
  ): Promise<IInventoryItem | null> {
    return InventoryItem.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IInventoryItem>();
  },

  /** Atomically applies a quantity delta (positive or negative) and returns the new balance. */
  async adjustQuantity(id: string, schoolId: string, delta: number): Promise<IInventoryItem | null> {
    return InventoryItem.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $inc: { qtyAvailable: delta } },
      { new: true },
    ).lean<IInventoryItem>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await InventoryItem.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  async recordMovement(data: CreateStockMovementData): Promise<IStockMovement> {
    const movement = new StockMovement(data);
    return movement.save();
  },

  async listMovements(itemId: string, schoolId: string, limit = 50): Promise<IStockMovement[]> {
    return StockMovement.find({ schoolId, itemId }).sort({ createdAt: -1 }).limit(limit).lean<IStockMovement[]>();
  },
};
