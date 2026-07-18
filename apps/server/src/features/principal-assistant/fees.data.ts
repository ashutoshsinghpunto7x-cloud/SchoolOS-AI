import { feeService } from '../fees/fee.service';
import { feeRepository } from '../fees/fee.repository';
import { AuthContext } from '../../lib/auth-context';

// ── Granular data fetchers ────────────────────────────────────────────────────
// Mirrors principal-assistant.data.ts's attendance fetchers — each function
// fetches only what it needs from the existing fee service/repository, and
// the backend does every calculation here. OpenAI never sees anything but
// the plain JSON these return.

export interface FeeOverview {
  totalCharged: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number; // 0-100, collected / (collected + outstanding)
  overdueCount: number;
  pendingCount: number;
}

export interface FeeClassBreakdown {
  class: string;
  section: string;
  collected: number;
  pending: number;
  collectionRate: number; // 0-100
}

export interface FeeClassExtremes {
  highestCollectionClass: FeeClassBreakdown | null;
  lowestCollectionClass: FeeClassBreakdown | null;
}

export type FullFeeSummary = FeeOverview & FeeClassExtremes;

export const feeAssistantData = {
  async getFeeOverview(ctx: AuthContext): Promise<FeeOverview> {
    const summary = await feeService.getSummary(ctx);
    // totalCharged already nets out discounts/waivers (see fee.repository's
    // getSummary), so collected + outstanding is the right denominator for a
    // collection rate rather than totalCharged, which double-counts waived amounts.
    const netExpected = summary.totalCollected + summary.totalOutstanding;
    const collectionRate = netExpected > 0 ? Math.round((summary.totalCollected / netExpected) * 10000) / 100 : 0;

    return {
      totalCharged: summary.totalCharged,
      totalCollected: summary.totalCollected,
      totalOutstanding: summary.totalOutstanding,
      collectionRate,
      overdueCount: summary.overdueCount,
      pendingCount: summary.pendingCount,
    };
  },

  async getFeeClassExtremes(ctx: AuthContext): Promise<FeeClassExtremes> {
    const totals = (await feeRepository.getClassSectionTotals(ctx.schoolId))
      .map((c): FeeClassBreakdown => ({
        class: c.class,
        section: c.section,
        collected: c.collected,
        pending: c.pending,
        collectionRate: c.collected + c.pending > 0
          ? Math.round((c.collected / (c.collected + c.pending)) * 10000) / 100
          : 0,
      }))
      .filter((c) => c.collected + c.pending > 0);

    const highest = totals.length ? totals.reduce((a, b) => (b.collectionRate > a.collectionRate ? b : a)) : null;
    const lowest = totals.length ? totals.reduce((a, b) => (b.collectionRate < a.collectionRate ? b : a)) : null;

    return { highestCollectionClass: highest, lowestCollectionClass: lowest };
  },

  /** Used by FEE_SUMMARY — the only intent that needs everything at once. */
  async getFullFeeSummary(ctx: AuthContext): Promise<FullFeeSummary> {
    const [overview, extremes] = await Promise.all([
      feeAssistantData.getFeeOverview(ctx),
      feeAssistantData.getFeeClassExtremes(ctx),
    ]);
    return { ...overview, ...extremes };
  },
};
