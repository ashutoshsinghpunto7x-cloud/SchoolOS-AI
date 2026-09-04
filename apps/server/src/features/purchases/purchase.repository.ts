import { PurchaseRequest, IPurchaseRequest, PurchaseCategory, PurchaseRequestStatus } from './purchase-request.model';
import { PurchaseOrder, IPurchaseOrder, PurchaseOrderStatus } from './purchase-order.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FindPurchaseRequestsOptions {
  page?: number;
  limit?: number;
  status?: PurchaseRequestStatus;
  category?: PurchaseCategory;
}

export interface PaginatedPurchaseRequests {
  records: IPurchaseRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface FindPurchaseOrdersOptions {
  page?: number;
  limit?: number;
  status?: PurchaseOrderStatus;
  vendorId?: string;
}

export interface PaginatedPurchaseOrders {
  records: IPurchaseOrder[];
  total: number;
  page: number;
  limit: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const purchaseRepository = {
  // Purchase Requests
  async createRequest(data: Partial<IPurchaseRequest>): Promise<IPurchaseRequest> {
    const request = new PurchaseRequest(data);
    return request.save();
  },

  async findRequestById(id: string, schoolId: string): Promise<IPurchaseRequest | null> {
    return PurchaseRequest.findOne({ _id: id, schoolId, isDeleted: false }).lean<IPurchaseRequest>();
  },

  async findAllRequests(schoolId: string, opts: FindPurchaseRequestsOptions = {}): Promise<PaginatedPurchaseRequests> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.status)   query.status   = opts.status;
    if (opts.category) query.category = opts.category;

    const [records, total] = await Promise.all([
      PurchaseRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IPurchaseRequest[]>(),
      PurchaseRequest.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async countPending(schoolId: string): Promise<number> {
    return PurchaseRequest.countDocuments({ schoolId, isDeleted: false, status: 'pending' });
  },

  async updateRequest(
    id: string,
    schoolId: string,
    data: Partial<IPurchaseRequest>,
  ): Promise<IPurchaseRequest | null> {
    return PurchaseRequest.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IPurchaseRequest>();
  },

  // Purchase Orders
  async createOrder(data: Partial<IPurchaseOrder>): Promise<IPurchaseOrder> {
    const order = new PurchaseOrder(data);
    return order.save();
  },

  async findOrderById(id: string, schoolId: string): Promise<IPurchaseOrder | null> {
    return PurchaseOrder.findOne({ _id: id, schoolId, isDeleted: false }).lean<IPurchaseOrder>();
  },

  async findAllOrders(schoolId: string, opts: FindPurchaseOrdersOptions = {}): Promise<PaginatedPurchaseOrders> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.status)   query.status   = opts.status;
    if (opts.vendorId) query.vendorId = opts.vendorId;

    const [records, total] = await Promise.all([
      PurchaseOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IPurchaseOrder[]>(),
      PurchaseOrder.countDocuments(query),
    ]);

    return { records, total, page, limit };
  },

  async updateOrder(
    id: string,
    schoolId: string,
    data: Partial<IPurchaseOrder>,
  ): Promise<IPurchaseOrder | null> {
    return PurchaseOrder.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IPurchaseOrder>();
  },
};
