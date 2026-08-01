import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { featureFlagsApi } from '../api/featureFlagsApi';
import type { CreateFeatureInput, UpdateFeatureInput, CreateAssignmentInput } from '../api/featureFlagsApi';

export const useFeatureFlagsList = () =>
  useQuery({
    queryKey: ['ops', 'feature-flags'],
    queryFn: featureFlagsApi.list,
  });

export const useFeatureFlagDetail = (key: string | undefined) =>
  useQuery({
    queryKey: ['ops', 'feature-flags', key],
    queryFn: () => featureFlagsApi.getByKey(key as string),
    enabled: !!key,
  });

export const useFeatureFlagAssignments = (key: string | undefined) =>
  useQuery({
    queryKey: ['ops', 'feature-flags', key, 'assignments'],
    queryFn: () => featureFlagsApi.listAssignments(key as string),
    enabled: !!key,
  });

export const useCreateFeatureFlag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeatureInput) => featureFlagsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags'] }),
  });
};

export const useUpdateFeatureFlag = (key: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFeatureInput) => featureFlagsApi.update(key, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags', key] });
    },
  });
};

export const useDeleteFeatureFlag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => featureFlagsApi.remove(key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags'] }),
  });
};

export const useRollbackFeatureFlag = (key: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => featureFlagsApi.rollback(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags', key] });
    },
  });
};

export const useCreateAssignment = (key: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => featureFlagsApi.createAssignment(key, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags', key, 'assignments'] }),
  });
};

export const useDeleteAssignment = (key: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => featureFlagsApi.deleteAssignment(key, assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'feature-flags', key, 'assignments'] }),
  });
};
