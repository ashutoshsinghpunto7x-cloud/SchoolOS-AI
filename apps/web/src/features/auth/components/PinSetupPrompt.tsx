import { useState, FormEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { saveRememberedDevice } from '../utils/rememberedDevices';

interface PinSetupPromptProps {
  email: string;
  onDone: () => void;
}

// Small, dismissible, non-blocking — shown once right after a successful
// password login when this browser has no remembered PIN device yet for the
// signed-in account. Skipping just navigates on, same as if this never showed.
export function PinSetupPrompt({ email, onDone }: PinSetupPromptProps) {
  const { setupPin } = useAuthContext();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { deviceId } = await setupPin(pin);
      saveRememberedDevice(email, deviceId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up PIN.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0E0E12]/95 border border-white/[0.06] rounded-2xl max-w-sm w-full p-7 text-white shadow-2xl shadow-black/80">
        <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-3">
          <KeyRound className="w-5 h-5 text-orange-500" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Set Up Quick PIN Sign-In?</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Create a 4-digit PIN so you can sign in faster on this device next time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" inputMode="numeric" maxLength={4} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full h-11 px-3.5 rounded-xl border border-white/[0.08] bg-black/40 text-base text-white tracking-[0.5em] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150"
            placeholder="New PIN"
          />
          <input
            type="password" inputMode="numeric" maxLength={4} value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className="w-full h-11 px-3.5 rounded-xl border border-white/[0.08] bg-black/40 text-base text-white tracking-[0.5em] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150"
            placeholder="Confirm PIN"
          />

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onDone}
              className="flex-1 h-11 rounded-xl text-sm font-semibold text-zinc-300 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
            >
              Not Now
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
