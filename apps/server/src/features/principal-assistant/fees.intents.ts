import { IntentDefinition } from './intent-router';
import { feeAssistantData } from './fees.data';
import { AuthContext } from '../../lib/auth-context';

// ── Fees intent registry ──────────────────────────────────────────────────────
// Sibling to principal-assistant.intents.ts's attendance registry — same
// shape, same router in intent-router.ts. See fees.data.ts for the fetchers.

export const feeIntents: IntentDefinition<AuthContext, unknown>[] = [
  {
    id: 'FEE_SUMMARY',
    description: 'A full overview of fee collection — e.g. "fee summary", "how are fees doing", "give me a fees report".',
    fetchData: feeAssistantData.getFullFeeSummary,
  },
  {
    id: 'TOTAL_FEES_COLLECTED',
    description: 'The total amount of fees collected so far.',
    fetchData: feeAssistantData.getFeeOverview,
  },
  {
    id: 'TOTAL_FEES_OUTSTANDING',
    description: 'The total amount of fees still outstanding, pending, or unpaid.',
    fetchData: feeAssistantData.getFeeOverview,
  },
  {
    id: 'FEE_COLLECTION_PERCENTAGE',
    description: 'The overall fee collection rate/percentage.',
    fetchData: feeAssistantData.getFeeOverview,
  },
  {
    id: 'OVERDUE_FEES_COUNT',
    description: 'How many fee records are overdue or pending payment.',
    fetchData: feeAssistantData.getFeeOverview,
  },
  {
    id: 'HIGHEST_FEE_COLLECTION_CLASS',
    description: 'Which class/section has the highest fee collection rate (e.g. "best fee collection").',
    fetchData: feeAssistantData.getFeeClassExtremes,
  },
  {
    id: 'LOWEST_FEE_COLLECTION_CLASS',
    description: 'Which class/section has the lowest fee collection rate, or the most defaulters/pending fees.',
    fetchData: feeAssistantData.getFeeClassExtremes,
  },
];
