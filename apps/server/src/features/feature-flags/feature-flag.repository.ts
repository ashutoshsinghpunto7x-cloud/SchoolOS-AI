import { Feature, IFeature } from './feature-flag.model';
import { FeatureAssignment, IFeatureAssignment, FeatureAssignmentTargetType } from './feature-assignment.model';
import { CreateFeatureInput, UpdateFeatureInput } from './feature-flag.validation';

export const featureFlagRepository = {
  async findAll(): Promise<IFeature[]> {
    return Feature.find().sort({ name: 1 }).lean<IFeature[]>();
  },

  async findByKey(key: string): Promise<IFeature | null> {
    return Feature.findOne({ key: key.toLowerCase() }).lean<IFeature>();
  },

  async create(data: CreateFeatureInput, createdBy: string): Promise<IFeature> {
    const doc = await Feature.create({ ...data, createdBy });
    return doc.toObject() as IFeature;
  },

  async update(key: string, data: UpdateFeatureInput, updatedBy: string): Promise<IFeature | null> {
    return Feature.findOneAndUpdate(
      { key: key.toLowerCase() },
      { $set: { ...data, updatedBy } },
      { new: true, runValidators: true }
    ).lean<IFeature>();
  },

  async delete(key: string): Promise<boolean> {
    const result = await Feature.deleteOne({ key: key.toLowerCase() });
    return result.deletedCount > 0;
  },

  async setVisibilityMode(key: string, visibilityMode: IFeature['visibilityMode'], updatedBy: string): Promise<IFeature | null> {
    return Feature.findOneAndUpdate(
      { key: key.toLowerCase() },
      { $set: { visibilityMode, updatedBy } },
      { new: true }
    ).lean<IFeature>();
  },

  async findAssignments(featureKey: string): Promise<IFeatureAssignment[]> {
    return FeatureAssignment.find({ featureKey: featureKey.toLowerCase() }).sort({ createdAt: -1 }).lean<IFeatureAssignment[]>();
  },

  async findAssignmentsForTarget(targetType: FeatureAssignmentTargetType, targetId: string): Promise<IFeatureAssignment[]> {
    return FeatureAssignment.find({ targetType, targetId }).lean<IFeatureAssignment[]>();
  },

  async createAssignment(featureKey: string, targetType: FeatureAssignmentTargetType, targetId: string, createdBy: string): Promise<IFeatureAssignment> {
    const doc = await FeatureAssignment.create({ featureKey: featureKey.toLowerCase(), targetType, targetId, createdBy });
    return doc.toObject() as IFeatureAssignment;
  },

  async deleteAssignment(id: string): Promise<IFeatureAssignment | null> {
    return FeatureAssignment.findByIdAndDelete(id).lean<IFeatureAssignment>();
  },

  async deleteAssignmentsForFeature(featureKey: string): Promise<void> {
    await FeatureAssignment.deleteMany({ featureKey: featureKey.toLowerCase() });
  },
};
