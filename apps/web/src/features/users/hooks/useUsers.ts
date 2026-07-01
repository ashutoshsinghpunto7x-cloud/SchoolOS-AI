import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users.api';
import type {
  CreateUserPayload,
  UpdateUserPayload,
  ChangeStatusPayload,
  UsersQueryOptions,
} from '@schoolos/types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (options: UsersQueryOptions) => [...userKeys.lists(), options] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  roles: () => [...userKeys.all, 'roles'] as const,
  permissions: () => [...userKeys.all, 'permissions'] as const,
};

export const useUsers = (options: UsersQueryOptions = {}) =>
  useQuery({
    queryKey: userKeys.list(options),
    queryFn: () => usersApi.list(options),
  });

export const useUser = (id: string) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: Boolean(id),
  });

export const useRoles = () =>
  useQuery({
    queryKey: userKeys.roles(),
    queryFn: usersApi.getRoles,
    staleTime: 5 * 60 * 1000,
  });

export const usePermissions = () =>
  useQuery({
    queryKey: userKeys.permissions(),
    queryFn: usersApi.getPermissions,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
  });
};

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
};

export const useChangeStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangeStatusPayload }) =>
      usersApi.changeStatus(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
  });
};
