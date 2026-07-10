import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolClassesApi } from '../api/school-classes.api';
import { studentKeys } from '@/features/students/hooks/useStudents';

export const schoolClassKeys = {
  all:         ['school-classes'] as const,
  feeOverview: ['school-classes', 'fee-overview'] as const,
};

export const useSchoolClasses = () =>
  useQuery({
    queryKey: schoolClassKeys.all,
    queryFn: schoolClassesApi.list,
  });

/** School-wide class-wise fee overview — shown on Principal/Admin dashboards. */
export const useClassFeeOverview = () =>
  useQuery({
    queryKey: schoolClassKeys.feeOverview,
    queryFn: schoolClassesApi.getFeeOverview,
    staleTime: 60_000,
  });

export const useCreateSchoolClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => schoolClassesApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolClassKeys.all }),
  });
};

export const useRenameSchoolClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => schoolClassesApi.rename(id, name),
    // Renaming cascades to every student under the old name server-side, so
    // student lists/profiles need refreshing too, not just the class catalog.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolClassKeys.all });
      qc.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};

export const useAddSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, section }: { id: string; section: string }) => schoolClassesApi.addSection(id, section),
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolClassKeys.all }),
  });
};

export const useRemoveSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, section }: { id: string; section: string }) => schoolClassesApi.removeSection(id, section),
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolClassKeys.all }),
  });
};

export const useDeleteSchoolClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schoolClassesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolClassKeys.all }),
  });
};
