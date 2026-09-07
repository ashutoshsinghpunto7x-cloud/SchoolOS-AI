import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { useCreateTeacherLogin } from '../hooks/useTeachers';
import { LOGIN_EMAIL_DOMAIN, generateLoginEmail, generatePassword } from '../utils/loginCredentials';

const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';

interface Props {
  teacherId: string;
  fullName: string;
  email?: string;
  /** Login emails already in use by other teachers, so the auto-generated one doesn't collide. */
  existingLoginEmails?: Set<string>;
  onClose: () => void;
}

/** Provisions a school login (separate loginEmail + password) for a teacher who
 *  has no user account yet — the "create" counterpart to LinkUserAccountCard's
 *  "link to an existing user" flow. Shared by TeacherLoginsPage and the teacher
 *  profile page so both offer the same one-click provisioning path. */
export function CreateLoginModal({ teacherId, fullName, email, existingLoginEmails, onClose }: Props) {
  const { mutateAsync, isPending } = useCreateTeacherLogin();
  const [loginEmail, setLoginEmail] = useState(() => generateLoginEmail(fullName, new Set(existingLoginEmails)));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(loginEmail.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');

    try {
      await mutateAsync({ teacherId, payload: { loginEmail: loginEmail.trim().toLowerCase(), password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create login.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Login created</h2>
            <p className="text-sm text-gray-500">
              Share the login email <span className="font-mono font-semibold text-gray-800">{loginEmail.trim()}</span> and
              the password you set with {fullName} — they can change the password themselves once signed in.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-5 h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">Create Login</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              For <span className="font-semibold text-gray-800">{fullName}</span>
              {email && <> ({email})</>}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Login Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={`e.g. jsmith@${LOGIN_EMAIL_DOMAIN}`}
                  autoComplete="off"
                  className={inputCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Auto-generated — separate from {email ? `their contact email (${email})` : 'any personal email on file'}. Edit if needed.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Password</label>
                  <button
                    type="button"
                    onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}
                    className="text-[11px] font-semibold text-[#5B21B6] hover:text-[#4C1D95]"
                  >
                    Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">At least 8 characters. Type your own or use Generate — you'll hand this off to the teacher yourself.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isPending ? 'Creating…' : 'Create Login'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
