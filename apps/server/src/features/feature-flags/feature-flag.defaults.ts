import { Feature, type FeatureStatus, type FeatureVisibilityMode } from './feature-flag.model';
import { featureFlagCache } from './feature-flag.cache';
import { logger } from '../../lib/logger';

/**
 * Flags the app itself ships and expects to exist, so Ops Center always has a
 * switch for them without anyone having to create it by hand first.
 *
 * Seeded with $setOnInsert only: a flag that already exists is NEVER touched,
 * so a rollback / visibility change made in Ops Center survives every restart
 * and redeploy. (If Ops deletes one of these flags it is recreated, enabled,
 * on the next server start — switch it off instead of deleting it.)
 */
interface DefaultFeature {
  key: string;
  name: string;
  description: string;
  version: string;
  status: FeatureStatus;
  visibilityMode: FeatureVisibilityMode;
}

export const DEFAULT_FEATURES: DefaultFeature[] = [
  {
    key: 'teacher-winter-theme',
    name: 'Teacher Dashboard — Winter Theme',
    description:
      'Seasonal winter look for the teacher dashboard (snowy hero, Frosty, school-day sleigh, snowman quest, snowfall). ' +
      'Use Emergency Rollback to instantly return every teacher to the standard dashboard — no redeploy needed.',
    version: '1.0',
    status: 'enabled',
    visibilityMode: 'everyone',
  },
];

export async function ensureDefaultFeatures(): Promise<void> {
  try {
    let created = 0;
    for (const f of DEFAULT_FEATURES) {
      const res = await Feature.updateOne(
        { key: f.key },
        { $setOnInsert: { ...f, rolloutPercentage: 0, createdBy: 'system' } },
        { upsert: true },
      );
      if (res.upsertedCount) created += 1;
    }
    if (created) await featureFlagCache.invalidate();
  } catch (err) {
    // Non-fatal: the app still runs; gated features just stay off until the next start.
    logger.error('[FeatureFlags] Failed to seed default features', { err });
  }
}
