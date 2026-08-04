import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Fingerprint, Loader2, Trash2, PlusCircle } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useWebAuthnCredentials, useDeleteWebAuthnCredential } from '../hooks/useWebAuthn';

export function PasskeyManagePage() {
  const navigate = useNavigate();
  const { registerPasskey, isPasskeyAvailable } = useAuthContext();
  const { data: credentials, isLoading } = useWebAuthnCredentials();
  const deleteCredential = useDeleteWebAuthnCredential();

  async function handleAdd() {
    try {
      await registerPasskey();
      toast.success('Fingerprint sign-in enabled on this device');
    } catch (err) {
      toast.error('Could not set up fingerprint sign-in', { description: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCredential.mutateAsync(id);
      toast.success('Passkey removed');
    } catch (err) {
      toast.error('Could not remove that passkey', { description: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-transparent">
      <div className="bg-white dark:bg-white/5 border-b border-gray-100 dark:border-white/5 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/teacher/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/60" />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white">Fingerprint Sign-In</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-[#5B21B6]" />
          </div>
          <p className="text-sm text-gray-500 dark:text-white/50">
            Devices where you can sign in with your fingerprint or Face ID instead of a password.
          </p>
        </div>

        {!isPasskeyAvailable && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-sm text-amber-700">
            This device doesn't support fingerprint/Face ID sign-in.
          </div>
        )}

        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : credentials && credentials.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {credentials.map((c) => (
                <div key={c._id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-4.5 h-4.5 text-gray-500 dark:text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{c.deviceLabel || 'This device'}</p>
                    <p className="text-xs text-gray-400 dark:text-white/30">Last used {new Date(c.lastUsedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button" onClick={() => handleDelete(c._id)} disabled={deleteCredential.isPending}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-white/30 text-center py-10">No passkeys set up yet</p>
          )}
        </div>

        {isPasskeyAvailable && (
          <button
            type="button" onClick={handleAdd}
            className="w-full h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Enable on this device
          </button>
        )}
      </div>
    </div>
  );
}
