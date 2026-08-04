import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webauthnApi } from '../api/webauthn.api';

const credentialsKey = ['auth', 'webauthn', 'credentials'] as const;

export const useWebAuthnCredentials = () =>
  useQuery({ queryKey: credentialsKey, queryFn: () => webauthnApi.listCredentials() });

export const useDeleteWebAuthnCredential = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => webauthnApi.deleteCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: credentialsKey }),
  });
};
