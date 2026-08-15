import crypto from 'crypto';
import { featureFlagRepository } from './feature-flag.repository';
import { featureFlagCache } from './feature-flag.cache';
import { IFeature } from './feature-flag.model';
import { IFeatureAssignment } from './feature-assignment.model';
import { User } from '../users/user.model';
import {
  CreateFeatureInput,
  UpdateFeatureInput,
  CreateAssignmentInput,
  UpdateTesterFlagsInput,
  createFeatureSchema,
  updateFeatureSchema,
  createAssignmentSchema,
  updateTesterFlagsSchema,
} from './feature-flag.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

const ALL_FEATURES_CACHE_KEY = 'features:all';
const ASSIGNMENTS_CACHE_KEY = (key: string) => `assignments:${key}`;

/** Everything the evaluator needs about the requesting user, beyond what's in AuthContext. */
interface EvalUser {
  userId: string;
  role: string;
  schoolId: string;
  isDeveloper: boolean;
  isInternalTester: boolean;
}

async function loadEvalUser(ctx: AuthContext): Promise<EvalUser> {
  const user = await User.findById(ctx.userId).select('isDeveloper isInternalTester').lean<{ isDeveloper?: boolean; isInternalTester?: boolean }>();
  return {
    userId: ctx.userId,
    role: ctx.role,
    schoolId: ctx.schoolId,
    isDeveloper: !!user?.isDeveloper,
    isInternalTester: !!user?.isInternalTester,
  };
}

async function getAllFeaturesCached(): Promise<IFeature[]> {
  const cached = await featureFlagCache.get<IFeature[]>(ALL_FEATURES_CACHE_KEY);
  if (cached) return cached;
  const features = await featureFlagRepository.findAll();
  await featureFlagCache.set(ALL_FEATURES_CACHE_KEY, features);
  return features;
}

async function getAssignmentsCached(featureKey: string): Promise<IFeatureAssignment[]> {
  const cacheKey = ASSIGNMENTS_CACHE_KEY(featureKey);
  const cached = await featureFlagCache.get<IFeatureAssignment[]>(cacheKey);
  if (cached) return cached;
  const assignments = await featureFlagRepository.findAssignments(featureKey);
  await featureFlagCache.set(cacheKey, assignments);
  return assignments;
}

/** Deterministic 0-99 bucket for a (feature, user) pair — stable across requests
 *  so a user never flickers in/out of a staged rollout between page loads. */
function rolloutBucket(featureKey: string, userId: string): number {
  const hash = crypto.createHash('md5').update(`${featureKey}:${userId}`).digest('hex');
  return parseInt(hash.slice(0, 8), 16) % 100;
}

function isWithinSchedule(feature: IFeature, now: Date): boolean {
  if (feature.enableFrom && now < feature.enableFrom) return false;
  if (feature.disableOn && now > feature.disableOn) return false;
  return true;
}

async function evaluateFeature(feature: IFeature, user: EvalUser): Promise<boolean> {
  // Kill switch always wins — this is what Emergency Rollback sets.
  if (feature.status === 'disabled' || feature.visibilityMode === 'nobody') return false;
  if (!isWithinSchedule(feature, new Date())) return false;
  if (feature.visibilityMode === 'everyone') return true;

  const assignments = await getAssignmentsCached(feature.key);
  for (const a of assignments) {
    if (a.targetType === 'user' && a.targetId === user.userId) return true;
    if (a.targetType === 'role' && a.targetId === user.role) return true;
    if (a.targetType === 'school' && a.targetId === user.schoolId) return true;
    if (a.targetType === 'segment' && a.targetId === 'developers' && user.isDeveloper) return true;
    if (a.targetType === 'segment' && a.targetId === 'internal_testers' && user.isInternalTester) return true;
  }

  if (feature.rolloutPercentage > 0) {
    return rolloutBucket(feature.key, user.userId) < feature.rolloutPercentage;
  }

  return false;
}

export const featureFlagService = {
  async listAll(): Promise<IFeature[]> {
    return featureFlagRepository.findAll();
  },

  async getByKey(key: string): Promise<IFeature> {
    const feature = await featureFlagRepository.findByKey(key);
    if (!feature) throw new NotFoundError('Feature');
    return feature;
  },

  async create(rawInput: unknown, ctx: AuthContext): Promise<IFeature> {
    const data: CreateFeatureInput = createFeatureSchema.parse(rawInput);
    const existing = await featureFlagRepository.findByKey(data.key);
    if (existing) throw new ValidationError(`A feature with key "${data.key}" already exists`);

    const feature = await featureFlagRepository.create(data, ctx.userId);
    await featureFlagCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'feature_flag.created', resource: 'feature_flag', resourceId: feature.key,
      details: { name: feature.name, version: feature.version },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return feature;
  },

  async update(key: string, rawInput: unknown, ctx: AuthContext): Promise<IFeature> {
    const data: UpdateFeatureInput = updateFeatureSchema.parse(rawInput);
    const existing = await featureFlagRepository.findByKey(key);
    if (!existing) throw new NotFoundError('Feature');

    const updated = await featureFlagRepository.update(key, data, ctx.userId);
    if (!updated) throw new NotFoundError('Feature');
    await featureFlagCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'feature_flag.updated', resource: 'feature_flag', resourceId: key,
      details: { before: existing, after: data },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async delete(key: string, ctx: AuthContext): Promise<void> {
    const existing = await featureFlagRepository.findByKey(key);
    if (!existing) throw new NotFoundError('Feature');

    await featureFlagRepository.deleteAssignmentsForFeature(key);
    await featureFlagRepository.delete(key);
    await featureFlagCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'feature_flag.deleted', resource: 'feature_flag', resourceId: key,
      details: { name: existing.name },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  /** Emergency Rollback — one-click kill switch, no redeploy needed. */
  async rollback(key: string, ctx: AuthContext): Promise<IFeature> {
    const existing = await featureFlagRepository.findByKey(key);
    if (!existing) throw new NotFoundError('Feature');

    const updated = await featureFlagRepository.setVisibilityMode(key, 'nobody', ctx.userId);
    if (!updated) throw new NotFoundError('Feature');
    await featureFlagCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'feature_flag.rollback', resource: 'feature_flag', resourceId: key,
      details: { previousVisibilityMode: existing.visibilityMode },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  async listAssignments(key: string): Promise<IFeatureAssignment[]> {
    await this.getByKey(key);
    return featureFlagRepository.findAssignments(key);
  },

  async createAssignment(key: string, rawInput: unknown, ctx: AuthContext): Promise<IFeatureAssignment> {
    const data: CreateAssignmentInput = createAssignmentSchema.parse(rawInput);
    await this.getByKey(key);

    if (data.targetType === 'segment' && !['developers', 'internal_testers'].includes(data.targetId)) {
      throw new ValidationError('segment targetId must be "developers" or "internal_testers"');
    }

    const assignment = await featureFlagRepository.createAssignment(key, data.targetType, data.targetId, ctx.userId);
    await featureFlagCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'feature_flag.assignment.created', resource: 'feature_flag', resourceId: key,
      details: { targetType: data.targetType, targetId: data.targetId },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return assignment;
  },

  async deleteAssignment(key: string, assignmentId: string, ctx: AuthContext): Promise<void> {
    const deleted = await featureFlagRepository.deleteAssignment(assignmentId);
    if (!deleted) throw new NotFoundError('Assignment');
    await featureFlagCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'feature_flag.assignment.removed', resource: 'feature_flag', resourceId: key,
      details: { targetType: deleted.targetType, targetId: deleted.targetId },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  async setTesterFlags(userId: string, rawInput: unknown, ctx: AuthContext): Promise<void> {
    const data: UpdateTesterFlagsInput = updateTesterFlagsSchema.parse(rawInput);
    const user = await User.findByIdAndUpdate(userId, { $set: data }, { new: true }).lean<{ email: string }>();
    if (!user) throw new NotFoundError('User');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'feature_flag.tester_flags_updated', resource: 'user', resourceId: userId,
      details: data,
      ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },

  /** Per-user view (requirement #5): every feature + whether it's enabled for this user. */
  async getFeaturesForUser(userId: string): Promise<{ feature: IFeature; enabled: boolean }[]> {
    const target = await User.findById(userId).lean<{ _id: unknown; role: string; schoolId: string; isDeveloper?: boolean; isInternalTester?: boolean }>();
    if (!target) throw new NotFoundError('User');

    const evalUser: EvalUser = {
      userId,
      role: target.role,
      schoolId: target.schoolId,
      isDeveloper: !!target.isDeveloper,
      isInternalTester: !!target.isInternalTester,
    };

    const features = await getAllFeaturesCached();
    const results = await Promise.all(features.map(async (feature) => ({
      feature,
      enabled: await evaluateFeature(feature, evalUser),
    })));
    return results;
  },

  /** What the app-wide useFeature()/<FeatureFlag> hooks call — one evaluation
   *  pass over every feature for the currently authenticated user. */
  async evaluateAllForUser(ctx: AuthContext): Promise<Record<string, boolean>> {
    const [features, evalUser] = await Promise.all([getAllFeaturesCached(), loadEvalUser(ctx)]);
    const entries = await Promise.all(
      features.map(async (feature) => [feature.key, await evaluateFeature(feature, evalUser)] as const)
    );
    return Object.fromEntries(entries);
  },
};
