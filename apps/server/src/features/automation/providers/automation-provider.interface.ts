import type { AutomationJobType, AutomationProviderName, IAutomationJob } from '../automation.model';

// ── Dispatch payload sent to any provider ─────────────────────────────────────

export interface AutomationDispatchPayload {
  /** The AutomationJob document ID — used by the provider to identify the webhook callback. */
  jobId: string;
  type: AutomationJobType;
  /** All domain-specific data needed by the provider. */
  payload: Record<string, unknown>;
  schoolName: string;
}

// ── Provider contract ─────────────────────────────────────────────────────────

/**
 * Every automation provider (n8n, BullMQ, Temporal, Workers) implements this interface.
 *
 * `dispatch` is fire-and-forget — the caller MUST NOT await it.
 * Job status is updated via the automation webhook: POST /automation/webhook.
 *
 * Providers that complete synchronously (mock simulation in dev) may update
 * the AutomationJob directly instead of going through the webhook path.
 */
export interface IAutomationProvider {
  readonly name: AutomationProviderName;

  /** Returns true if this provider can handle the given job type. */
  supports(type: AutomationJobType): boolean;

  /**
   * Fire-and-forget dispatch.
   * Errors must be caught and logged internally — never thrown to the caller.
   */
  dispatch(data: AutomationDispatchPayload, job: IAutomationJob): void;
}
