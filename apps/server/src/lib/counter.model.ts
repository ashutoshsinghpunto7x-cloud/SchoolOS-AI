import mongoose, { Document, Schema } from 'mongoose';

// ── Atomic sequence counters ─────────────────────────────────────────────────
// Backs any human-readable sequential ID (employee IDs, admission numbers,
// receipt numbers, ...) with a single atomic $inc per call, so concurrent
// callers (e.g. a batch-processed bulk import) can never read the same "next
// number" — unlike deriving it from a live countDocuments(), which races.

export interface ICounter extends Omit<Document, '_id'> {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Atomically returns the next sequence number for `key`.
 * `seedFrom`, if given, is only used the very first time `key` is seen (e.g.
 * to continue from an existing countDocuments() total instead of restarting
 * at 1) — a concurrent first call is still race-safe: only one seed insert
 * wins, everyone else falls back to a plain atomic increment.
 */
export const nextSequence = async (key: string, seedFrom?: () => Promise<number>): Promise<number> => {
  const incremented = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true }
  ).lean<ICounter>();

  if (incremented) return incremented.seq;

  const startAt = (await seedFrom?.()) ?? 0;
  try {
    const created = await Counter.create({ _id: key, seq: startAt + 1 });
    return created.seq;
  } catch (err) {
    // Another concurrent first-call already seeded it — just increment now.
    if (err instanceof Error && (err as { code?: number }).code === 11000) {
      const result = await Counter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      ).lean<ICounter>();
      return result!.seq;
    }
    throw err;
  }
};
