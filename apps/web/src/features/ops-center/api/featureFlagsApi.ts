import { apiClient } from '@/services/api';

export type FeatureStatus = 'enabled' | 'disabled' | 'maintenance' | 'beta' | 'deprecated';
export type FeatureVisibilityMode = 'nobody' | 'everyone' | 'custom';
export type FeatureAssignmentTargetType = 'user' | 'role' | 'school' | 'segment';

export interface Feature {
  _id: string;
  key: string;
  name: string;
  description?: string;
  version?: string;
  status: FeatureStatus;
  visibilityMode: FeatureVisibilityMode;
  rolloutPercentage: number;
  enableFrom?: string;
  disableOn?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureAssignment {
  _id: string;
  featureKey: string;
  targetType: FeatureAssignmentTargetType;
  targetId: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateFeatureInput {
  key: string;
  name: string;
  description?: string;
  version?: string;
}

export interface UpdateFeatureInput {
  name?: string;
  description?: string;
  version?: string;
  status?: FeatureStatus;
  visibilityMode?: FeatureVisibilityMode;
  rolloutPercentage?: number;
  enableFrom?: string | null;
  disableOn?: string | null;
}

export interface CreateAssignmentInput {
  targetType: FeatureAssignmentTargetType;
  targetId: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const featureFlagsApi = {
  async list(): Promise<Feature[]> {
    const res = await apiClient.get<ApiEnvelope<Feature[]>>('/ops/feature-flags');
    return res.data.data;
  },

  async getByKey(key: string): Promise<Feature> {
    const res = await apiClient.get<ApiEnvelope<Feature>>(`/ops/feature-flags/${encodeURIComponent(key)}`);
    return res.data.data;
  },

  async create(input: CreateFeatureInput): Promise<Feature> {
    const res = await apiClient.post<ApiEnvelope<Feature>>('/ops/feature-flags', input);
    return res.data.data;
  },

  async update(key: string, input: UpdateFeatureInput): Promise<Feature> {
    const res = await apiClient.patch<ApiEnvelope<Feature>>(`/ops/feature-flags/${encodeURIComponent(key)}`, input);
    return res.data.data;
  },

  async remove(key: string): Promise<void> {
    await apiClient.delete(`/ops/feature-flags/${encodeURIComponent(key)}`);
  },

  async rollback(key: string): Promise<Feature> {
    const res = await apiClient.post<ApiEnvelope<Feature>>(`/ops/feature-flags/${encodeURIComponent(key)}/rollback`);
    return res.data.data;
  },

  async listAssignments(key: string): Promise<FeatureAssignment[]> {
    const res = await apiClient.get<ApiEnvelope<FeatureAssignment[]>>(`/ops/feature-flags/${encodeURIComponent(key)}/assignments`);
    return res.data.data;
  },

  async createAssignment(key: string, input: CreateAssignmentInput): Promise<FeatureAssignment> {
    const res = await apiClient.post<ApiEnvelope<FeatureAssignment>>(`/ops/feature-flags/${encodeURIComponent(key)}/assignments`, input);
    return res.data.data;
  },

  async deleteAssignment(key: string, assignmentId: string): Promise<void> {
    await apiClient.delete(`/ops/feature-flags/${encodeURIComponent(key)}/assignments/${assignmentId}`);
  },

  async getFeaturesForUser(userId: string): Promise<{ feature: Feature; enabled: boolean }[]> {
    const res = await apiClient.get<ApiEnvelope<{ feature: Feature; enabled: boolean }[]>>(`/ops/feature-flags/users/${userId}`);
    return res.data.data;
  },

  async setTesterFlags(userId: string, input: { isDeveloper?: boolean; isInternalTester?: boolean }): Promise<void> {
    await apiClient.patch(`/ops/feature-flags/testers/${userId}`, input);
  },
};
