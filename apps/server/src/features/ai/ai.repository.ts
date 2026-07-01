import { AiConversation, AiUsage, IAiConversation, IAiUsage } from './ai.model';

// ── AiConversation ────────────────────────────────────────────────────────────

type CreateConversationData = Pick<
  IAiConversation,
  'provider' | 'promptId' | 'promptVersion' | 'communicationId' | 'studentId' | 'createdBy' | 'schoolId'
> & Partial<Pick<IAiConversation, 'conversationId' | 'metadata'>>;

type UpdateConversationData = Partial<Pick<
  IAiConversation,
  'status' | 'transcript' | 'summary' | 'durationSeconds' | 'metadata' | 'conversationId'
>>;

export const aiConversationRepository = {
  async create(data: CreateConversationData): Promise<IAiConversation> {
    return AiConversation.create(data);
  },

  async findById(id: string): Promise<IAiConversation | null> {
    return AiConversation.findById(id).lean<IAiConversation>();
  },

  async findByConversationId(conversationId: string): Promise<IAiConversation | null> {
    return AiConversation.findOne({ conversationId }).lean<IAiConversation>();
  },

  async findByCommunicationId(communicationId: string): Promise<IAiConversation | null> {
    return AiConversation.findOne({ communicationId }).sort({ createdAt: -1 }).lean<IAiConversation>();
  },

  async updateById(id: string, data: UpdateConversationData): Promise<IAiConversation | null> {
    return AiConversation.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<IAiConversation>();
  },

  async updateByConversationId(
    conversationId: string,
    data: UpdateConversationData
  ): Promise<IAiConversation | null> {
    return AiConversation.findOneAndUpdate(
      { conversationId },
      { $set: data },
      { new: true }
    ).lean<IAiConversation>();
  },
};

// ── AiUsage ───────────────────────────────────────────────────────────────────

type CreateUsageData = Pick<
  IAiUsage,
  'provider' | 'aiModel' | 'promptTokens' | 'completionTokens' | 'totalTokens' | 'estimatedCostUsd' | 'schoolId'
> & Partial<Pick<IAiUsage, 'durationMs' | 'communicationId' | 'conversationId'>>;

export const aiUsageRepository = {
  /** Fire-and-forget — never awaited by callers. */
  record(data: CreateUsageData): void {
    AiUsage.create(data).catch(() => {
      // Usage logging must never fail silently-loudly — absorb errors here
    });
  },
};
