import { WebhookEndpoint, WebhookDelivery, type IWebhookEndpoint, type IWebhookDelivery, type WebhookDeliveryStatus } from './webhook.model';

export const webhookEndpointRepository = {
  async create(data: Partial<IWebhookEndpoint>): Promise<IWebhookEndpoint> {
    return WebhookEndpoint.create(data);
  },

  // schoolId is part of the query itself (not just checked after the fact by
  // the caller) so tenant isolation doesn't depend on every call site
  // remembering to re-check it.
  async findById(id: string, schoolId: string): Promise<IWebhookEndpoint | null> {
    return WebhookEndpoint.findOne({ _id: id, schoolId }).lean<IWebhookEndpoint>();
  },

  async findBySchool(schoolId: string): Promise<IWebhookEndpoint[]> {
    return WebhookEndpoint.find({ schoolId }).sort({ createdAt: -1 }).lean<IWebhookEndpoint[]>();
  },

  async findByEvent(schoolId: string, event: string): Promise<IWebhookEndpoint[]> {
    return WebhookEndpoint.find({ schoolId, enabled: true, events: event }).lean<IWebhookEndpoint[]>();
  },

  async update(id: string, data: Partial<IWebhookEndpoint>): Promise<IWebhookEndpoint | null> {
    return WebhookEndpoint.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<IWebhookEndpoint>();
  },

  async delete(id: string): Promise<void> {
    await WebhookEndpoint.findByIdAndDelete(id);
  },
};

export const webhookDeliveryRepository = {
  async create(data: { webhookId: string; schoolId: string; event: string; payload: Record<string, unknown> }): Promise<IWebhookDelivery> {
    return WebhookDelivery.create(data);
  },

  async findById(id: string): Promise<IWebhookDelivery | null> {
    return WebhookDelivery.findById(id).lean<IWebhookDelivery>();
  },

  async findByWebhook(webhookId: string, page: number, limit: number): Promise<{ data: IWebhookDelivery[]; total: number }> {
    const [data, total] = await Promise.all([
      WebhookDelivery.find({ webhookId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<IWebhookDelivery[]>(),
      WebhookDelivery.countDocuments({ webhookId }),
    ]);
    return { data, total };
  },

  async findBySchool(schoolId: string, page: number, limit: number): Promise<{ data: IWebhookDelivery[]; total: number }> {
    const [data, total] = await Promise.all([
      WebhookDelivery.find({ schoolId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<IWebhookDelivery[]>(),
      WebhookDelivery.countDocuments({ schoolId }),
    ]);
    return { data, total };
  },

  async updateStatus(id: string, status: WebhookDeliveryStatus, attempt?: { statusCode?: number; responseBody?: string; error?: string; durationMs?: number }, nextRetryAt?: Date): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (nextRetryAt) update.nextRetryAt = nextRetryAt;
    const push: Record<string, unknown> = {};
    if (attempt) {
      push['$push'] = { attempts: { ...attempt, attemptedAt: new Date() } };
    }
    await WebhookDelivery.findByIdAndUpdate(id, { $set: update, ...push });
  },

  async findPendingRetries(): Promise<IWebhookDelivery[]> {
    const now = new Date();
    return WebhookDelivery.find({ status: 'retrying', nextRetryAt: { $lte: now } }).lean<IWebhookDelivery[]>();
  },
};
