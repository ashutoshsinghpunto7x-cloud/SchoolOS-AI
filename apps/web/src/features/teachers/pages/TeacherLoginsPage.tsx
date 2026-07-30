import { useState } from 'react';
import { KeyRound, Loader2, CheckCircle2, AlertCircle, X, Eye, EyeOff, Sparkles, Copy, Check, Trash2, Pencil } from 'lucide-react';
import type { TeacherLoginStatus } from '@schoolos/types';
import { useTeacherLoginStatus, useCreateTeacherLogin, useDeleteTeacherLogin, useUpdateTeacherLoginEmail } from '../hooks/useTeachers';

// ── Bulk credential generation ────────────────────────────────────────────────

/** Default domain for admin-generated school login addresses — edit per school. */
const LOGIN_EMAIL_DOMAIN = 'fnic.com';

const USERNAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function randomFrom(chars: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function generatePassword(): string {
  return randomFrom(PASSWORD_CHARS, 10);
}

/** firstname + last-initial base, falling back to a random string. */
function slugFromName(fullName: string): string {
  const parts = fullName.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 0
    ? (parts[0] + (parts[1]?.[0] ?? '')).slice(0, 14)
    : `teacher${randomFrom(USERNAME_CHARS, 4)}`;
}

/** Generates a school login email like jsmith@fnic.com, appending a numeric
 *  suffix until it doesn't collide with any login email already taken
 *  (existing logins) or generated earlier in this batch. */
function generateLoginEmail(fullName: string, taken: Set<string>, domain = LOGIN_EMAIL_DOMAIN): string {
  const base = slugFromName(fullName);
  let local = base.length >= 3 ? base : `${base}${randomFrom(USERNAME_CHARS, 3 - base.length)}`;
  let candidate = `${local}@${domain}`;
  while (taken.has(candidate)) {
    local = `${base}${randomFrom('0123456789', 3)}`;
    candidate = `${local}@${domain}`;
  }
  taken.add(candidate);
  return candidate;
}

interface BulkResult {
  teacherId: string;
  fullName: string;
  loginEmail?: string;
  password?: string;
  status: 'ok' | 'error' | 'skipped';
  error?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function BulkResultsModal({ results, onClose }: { results: BulkResult[]; onClose: () => void }) {
  const ok = results.filter((r) => r.status === 'ok');
  const failed = results.filter((r) => r.status === 'error');
  const skipped = results.filter((r) => r.status === 'skipped');

  function copyAll() {
    const text = ok.map((r) => `${r.fullName}\t${r.loginEmail}\t${r.password}`).join('\n');
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Generated Logins</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {ok.length} login{ok.length !== 1 ? 's' : ''} created
          {skipped.length > 0 && `, ${skipped.length} skipped`}
          {failed.length > 0 && `, ${failed.length} failed`}. Copy these and hand them out — teachers can change their password after signing in.
        </p>

        {ok.length > 0 && (
          <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 mb-3">
            {ok.map((r) => (
              <div key={r.teacherId} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.fullName}</p>
                  <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                    {r.loginEmail} <CopyButton text={r.loginEmail!} />
                  </p>
                </div>
                <p className="text-xs text-gray-500 font-mono flex items-center gap-1 shrink-0">
                  {r.password} <CopyButton text={r.password!} />
                </p>
              </div>
            ))}
          </div>
        )}

        {(failed.length > 0 || skipped.length > 0) && (
          <div className="text-xs text-gray-400 mb-3 space-y-1">
            {[...skipped, ...failed].map((r) => (
              <p key={r.teacherId}>{r.fullName} — {r.error ?? 'skipped'}</p>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {ok.length > 0 && (
            <button
              onClick={copyAll}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy All
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

type Filter = 'all' | 'allotted' | 'not_set';

const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]';

function CreateLoginModal({
  teacher,
  existingLoginEmails,
  onClose,
}: {
  teacher: TeacherLoginStatus;
  existingLoginEmails: Set<string>;
  onClose: () => void;
}) {
  const { mutateAsync, isPending } = useCreateTeacherLogin();
  const [loginEmail, setLoginEmail] = useState(() => generateLoginEmail(teacher.fullName, new Set(existingLoginEmails)));
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
      await mutateAsync({ teacherId: teacher.teacherId, payload: { loginEmail: loginEmail.trim().toLowerCase(), password } });
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
              the password you set with {teacher.fullName} — they can change the password themselves once signed in.
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
              For <span className="font-semibold text-gray-800">{teacher.fullName}</span>
              {teacher.email && <> ({teacher.email})</>}
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
                  Auto-generated — separate from {teacher.email ? `their contact email (${teacher.email})` : 'any personal email on file'}. Edit if needed.
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

function DeleteLoginModal({
  teacher,
  onClose,
}: {
  teacher: TeacherLoginStatus;
  onClose: () => void;
}) {
  const { mutateAsync, isPending } = useDeleteTeacherLogin();
  const [error, setError] = useState('');

  async function handleDelete() {
    setError('');
    try {
      await mutateAsync(teacher.teacherId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete login.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Delete Login</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          This removes the school login <span className="font-mono font-semibold text-gray-800">{teacher.loginEmail ?? teacher.username}</span>
          {' '}for <span className="font-semibold text-gray-800">{teacher.fullName}</span>. They will no longer be able to sign in with it, and
          you'll be able to create a fresh login for them right after. This can't be undone.
        </p>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm font-bold text-white flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEmailModal({
  teacher,
  existingLoginEmails,
  onClose,
}: {
  teacher: TeacherLoginStatus;
  existingLoginEmails: Set<string>;
  onClose: () => void;
}) {
  const { mutateAsync, isPending } = useUpdateTeacherLoginEmail();
  const [loginEmail, setLoginEmail] = useState(teacher.loginEmail ?? teacher.username ?? '');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const next = loginEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(next)) return setError('Enter a valid email address.');
    if (next !== teacher.loginEmail?.toLowerCase() && existingLoginEmails.has(next)) {
      return setError('That login email is already in use.');
    }
    try {
      await mutateAsync({ teacherId: teacher.teacherId, loginEmail: next });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update login email.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Change Login Email</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          For <span className="font-semibold text-gray-800">{teacher.fullName}</span>. The password stays the same — only
          the sign-in email changes.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Login Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="off"
              autoFocus
              className={inputCls}
            />
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
            {isPending ? 'Saving…' : 'Save Email'}
          </button>
        </form>
      </div>
    </div>
  );
}

type BulkPasswordMode = 'unique' | 'same';

export function TeacherLoginsPage() {
  const { data, isLoading, isError } = useTeacherLoginStatus();
  const { mutateAsync: createLogin } = useCreateTeacherLogin();
  const [filter, setFilter] = useState<Filter>('all');
  const [creatingFor, setCreatingFor] = useState<TeacherLoginStatus | null>(null);
  const [deletingFor, setDeletingFor] = useState<TeacherLoginStatus | null>(null);
  const [editingFor, setEditingFor] = useState<TeacherLoginStatus | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [showBulkOptions, setShowBulkOptions] = useState(false);
  const [bulkPasswordMode, setBulkPasswordMode] = useState<BulkPasswordMode>('unique');
  const [bulkSharedPassword, setBulkSharedPassword] = useState('');
  const [showBulkSharedPassword, setShowBulkSharedPassword] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const teachers = data ?? [];
  const filtered = teachers.filter((t) => {
    if (filter === 'allotted') return t.hasLogin;
    if (filter === 'not_set') return !t.hasLogin;
    return true;
  });

  const allottedCount = teachers.filter((t) => t.hasLogin).length;
  const needsLogin = teachers.filter((t) => !t.hasLogin);
  const existingLoginEmails = new Set(
    teachers.map((t) => t.loginEmail).filter((e): e is string => !!e).map((e) => e.toLowerCase()),
  );

  async function generateAll() {
    if (bulkPasswordMode === 'same' && bulkSharedPassword.length < 8) {
      setBulkError('Shared password must be at least 8 characters.');
      return;
    }
    setBulkError('');
    setBulkRunning(true);
    const takenEmails = new Set(existingLoginEmails);
    const results: BulkResult[] = [];

    // Sequential, not parallel — each generated login email is checked against
    // the running `takenEmails` set, which only works if one create finishes
    // (and its email gets reserved) before the next starts.
    for (const t of needsLogin) {
      const loginEmail = generateLoginEmail(t.fullName, takenEmails);
      const password = bulkPasswordMode === 'same' ? bulkSharedPassword : generatePassword();
      try {
        await createLogin({ teacherId: t.teacherId, payload: { loginEmail, password } });
        results.push({ teacherId: t.teacherId, fullName: t.fullName, loginEmail, password, status: 'ok' });
      } catch (err) {
        results.push({
          teacherId: t.teacherId, fullName: t.fullName, status: 'error',
          error: err instanceof Error ? err.message : 'Failed to create login',
        });
      }
    }

    setBulkRunning(false);
    setShowBulkOptions(false);
    setBulkResults(results);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-[#5B21B6]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Logins</h1>
        </div>
        {needsLogin.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBulkOptions((v) => !v)}
            disabled={bulkRunning}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-60 shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)' }}
          >
            {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {bulkRunning ? `Generating ${needsLogin.length}…` : `Generate All (${needsLogin.length})`}
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Imported teachers have no self-signup — generate a school login email and password here to give one access.
        {teachers.length > 0 && ` ${allottedCount} of ${teachers.length} teachers have a login.`}
      </p>

      {showBulkOptions && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">
            Generating logins for {needsLogin.length} teacher{needsLogin.length === 1 ? '' : 's'} — school emails like
            {' '}<span className="font-mono text-gray-500">name@{LOGIN_EMAIL_DOMAIN}</span> will be created automatically.
          </p>
          <div className="flex items-center gap-2">
            {([
              { label: 'Unique random password per teacher', value: 'unique' as const },
              { label: 'Same password for all', value: 'same' as const },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBulkPasswordMode(opt.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  bulkPasswordMode === opt.value
                    ? 'bg-[#5B21B6] text-white border-[#5B21B6]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {bulkPasswordMode === 'same' && (
            <div className="max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-600">Shared password</label>
                <button
                  type="button"
                  onClick={() => { setBulkSharedPassword(generatePassword()); setShowBulkSharedPassword(true); }}
                  className="text-[11px] font-semibold text-[#5B21B6] hover:text-[#4C1D95]"
                >
                  Generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showBulkSharedPassword ? 'text' : 'password'}
                  value={bulkSharedPassword}
                  onChange={(e) => setBulkSharedPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowBulkSharedPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showBulkSharedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Every teacher in this batch gets this password — they can change it after signing in.</p>
            </div>
          )}
          {bulkError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {bulkError}
            </div>
          )}
          <button
            type="button"
            onClick={generateAll}
            disabled={bulkRunning}
            className="h-10 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)' }}
          >
            {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {bulkRunning ? `Generating ${needsLogin.length}…` : `Confirm — Generate ${needsLogin.length}`}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {([
          { label: 'All', value: 'all' as const },
          { label: 'Allotted', value: 'allotted' as const },
          { label: 'Not Set', value: 'not_set' as const },
        ]).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === f.value
                ? 'bg-[#5B21B6] text-white border-[#5B21B6]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#5B21B6] animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-red-500">Failed to load teachers. Please refresh.</div>
        ) : !filtered.length ? (
          <div className="py-16 text-center text-sm text-gray-400">No teachers found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Employee ID</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Login Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.teacherId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{t.fullName}</td>
                  <td className="px-5 py-3.5 text-gray-600">{t.employeeId}</td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {t.email || <span className="text-gray-300 italic">No email on file</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {t.hasLogin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        Allotted{t.loginEmail ? ` · ${t.loginEmail}` : t.username ? ` · ${t.username}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                        Not Set
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!t.hasLogin ? (
                      <button
                        onClick={() => setCreatingFor(t)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#5B21B6] hover:bg-[#4C1D95] text-white"
                      >
                        Create Login
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingFor(t)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Change Email
                        </button>
                        <button
                          onClick={() => setDeletingFor(t)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Login
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creatingFor && (
        <CreateLoginModal
          teacher={creatingFor}
          existingLoginEmails={existingLoginEmails}
          onClose={() => setCreatingFor(null)}
        />
      )}
      {bulkResults && <BulkResultsModal results={bulkResults} onClose={() => setBulkResults(null)} />}
      {deletingFor && <DeleteLoginModal teacher={deletingFor} onClose={() => setDeletingFor(null)} />}
      {editingFor && (
        <EditEmailModal teacher={editingFor} existingLoginEmails={existingLoginEmails} onClose={() => setEditingFor(null)} />
      )}
    </div>
  );
}
