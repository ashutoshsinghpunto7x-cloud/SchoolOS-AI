import { useQuery } from '@tanstack/react-query';
import { operationsApi } from '../api/operations.api';

export const operationsKeys = {
  summary: ['operations', 'summary'] as const,
};

export const useOperationsSummary = () =>
  useQuery({
    queryKey: operationsKeys.summary,
    queryFn: operationsApi.getSummary,
    refetchInterval: 60_000,
  });
