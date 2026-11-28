import { apiClient, extractErrorMessage } from '@/services/api';

export interface PlanAssistantTarget {
  teacherId?: string;
  class?: string;
  section?: string;
  subject?: string;
}

/** Opaque to the web app: shown as `changes`, sent back unchanged on approval. */
export type PlanOperation = { type: string } & Record<string, unknown>;

export interface PlanChange {
  /** 'YYYY-MM-DD' for a day, 'YYYY-MM' for a monthly planner row. */
  date: string;
  label: string;
  before: string;
  after: string;
}

export interface PlanProposal {
  planId: string;
  planVersion: number;
  planLabel: string;
  operations: PlanOperation[];
  changes: PlanChange[];
}

export type PlanInterpretResult =
  | { type: 'not_plan' }
  | { type: 'clarify'; message: string; options: string[] }
  | { type: 'answer'; message: string }
  | ({ type: 'proposal'; message: string } & PlanProposal);

export interface PlanInterpretPayload {
  message: string;
  target: PlanAssistantTarget;
  history: { role: 'user' | 'assistant'; content: string }[];
  pendingOperations?: PlanOperation[];
  today: string;
  tzOffsetMinutes: number;
}

export const planAssistantApi = {
  async interpret(payload: PlanInterpretPayload): Promise<PlanInterpretResult> {
    try {
      const res = await apiClient.post<{ data: PlanInterpretResult }>('/academic-plan/assistant/interpret', payload, {
        // Reading a whole year's plan can take longer than an ordinary request.
        timeout: 90_000,
      });
      return res.data.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async apply(
    proposal: PlanProposal, tzOffsetMinutes: number,
  ): Promise<{ changedCount: number }> {
    try {
      const res = await apiClient.post<{ data: { changedCount: number } }>('/academic-plan/assistant/apply', {
        planId: proposal.planId,
        planVersion: proposal.planVersion,
        operations: proposal.operations,
        tzOffsetMinutes,
      });
      return res.data.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
