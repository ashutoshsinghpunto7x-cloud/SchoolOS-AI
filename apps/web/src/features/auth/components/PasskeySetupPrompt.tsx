import { useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';

const DISMISSED_KEY_PREFIX = 'schoolos.passkeyPromptDismissed.';

export function markPasskeyPromptDismissed(email: string): void {
  try {
    localStorage.setItem(`${DISMISSED_KEY_PREFIX}${email.toLowerCase()}`, '1');
  } catch {
    // localStorage unavailable (private mode etc.) — worst case the prompt reappears next login.
  }
}

export function wasPasskeyPromptDismissed(email: string): boolean {
  try {
    return localStorage.getItem(`${DISMISSED_KEY_PREFIX}${email.toLowerCase()}`) === '1';
  } catch {
    return false;
  }
}

interface PasskeySetupPromptProps {
  email: string;
  onDone: () => void;
}

// Small, dismissible, non-blocking — shown once right after a successful password login on a
// device that supports a platform authenticator and has no passkey registered yet for this
// account. Skipping just navigates on and is remembered so it doesn't nag every login.
export function PasskeySetupPrompt({ email, onDone }: PasskeySetupPromptProps) {
  const { registerPasskey } = useAuthContext();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function skip() {
    markPasskeyPromptDismissed(email);
    onDone();
  }

  async function handleSetup() {
    setError('');
    setIsSubmitting(true);
    try {
      await registerPasskey();
      markPasskeyPromptDismissed(email);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up fingerprint sign-in.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0E0E12]/95 border border-white/[0.06] rounded-2xl max-w-sm w-full p-7 text-white shadow-2xl shadow-black/80">
        <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-3">
          <Fingerprint className="w-5 h-5 text-orange-500" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Turn On Fingerprint Sign-In?</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Use your fingerprint or Face ID to sign in instantly on this device next time — no password needed.
        </p>

        {error && <p className="text-sm font-medium text-red-400 mb-3">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={skip}
            className="flex-1 h-11 rounded-xl text-sm font-semibold text-zinc-300 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={handleSetup}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Turn On'}
          </button>
        </div>
      </div>
    </div>
  );
}
