import mongoose, { Schema } from 'mongoose';
import { ConversationState, emptyState, isFresh } from './conversation-state';
import { logger } from '../../lib/logger';

// One structured state document per (school, user). It is keyed by the
// authenticated user, never by anything the client sends, so one person can
// never read or steer another person's conversation context. It holds entity
// labels (a student's name, a class, a period) and never the fetched records.
// A TTL index removes idle conversations after 2 hours.

interface IAssistantConversation {
  schoolId: string;
  userId: string;
  state: ConversationState;
  updatedAt: Date;
}

const schema = new Schema<IAssistantConversation>(
  {
    schoolId: { type: String, required: true },
    userId: { type: String, required: true },
    state: { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
schema.index({ schoolId: 1, userId: 1 }, { unique: true });
schema.index({ updatedAt: 1 }, { expireAfterSeconds: 2 * 60 * 60 });

const Model =
  (mongoose.models.AssistantConversation as mongoose.Model<IAssistantConversation>) ||
  mongoose.model<IAssistantConversation>('AssistantConversation', schema);

export const conversationStateStore = {
  /** Never throws: a state-store outage must degrade to "no memory", not to a failed chat. */
  async load(schoolId: string, userId: string): Promise<ConversationState> {
    try {
      const doc = await Model.findOne({ schoolId, userId }).lean<IAssistantConversation>();
      if (doc?.state && isFresh(doc.state)) return doc.state;
    } catch (err) {
      logger.warn('[PrincipalAssistant] State load failed', { err: (err as Error).message });
    }
    return emptyState();
  },

  async save(schoolId: string, userId: string, state: ConversationState): Promise<void> {
    try {
      await Model.updateOne({ schoolId, userId }, { $set: { state, updatedAt: new Date() } }, { upsert: true });
    } catch (err) {
      logger.warn('[PrincipalAssistant] State save failed', { err: (err as Error).message });
    }
  },

  async clear(schoolId: string, userId: string): Promise<void> {
    try {
      await Model.deleteOne({ schoolId, userId });
    } catch (err) {
      logger.warn('[PrincipalAssistant] State clear failed', { err: (err as Error).message });
    }
  },
};
