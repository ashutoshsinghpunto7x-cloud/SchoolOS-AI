import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { ChangePasswordPayload } from '@schoolos/types';

export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authApi.changePassword(payload),
  });
