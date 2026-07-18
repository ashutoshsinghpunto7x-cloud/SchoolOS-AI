import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateStudentPayload } from '@schoolos/types';
import { studentsApi } from './api';

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudentPayload) => studentsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });
}
