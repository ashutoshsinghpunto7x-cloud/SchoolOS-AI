import { useState } from 'react';
import { Link2, CheckCircle2, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useLinkTeacherUser } from '../hooks/useTeachers';
import type { Teacher } from '@schoolos/types';

interface Props {
  teacher: Teacher;
}

export function LinkUserAccountCard({ teacher }: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: usersData, isLoading: usersLoading } = useUsers({ role: 'teacher', limit: 200 });
  const { mutateAsync: linkUser, isPending, error } = useLinkTeacherUser(teacher._id);

  const teacherUsers = usersData?.data ?? [];

  // Detect if already linked: a teacher-role user has this email
  const linkedUser = teacherUsers.find((u) => u.email === teacher.email);
  const isLinked   = Boolean(linkedUser);

  async function handleLink() {
    if (!selectedUserId) return;
    await linkUser(selectedUserId);
    setSuccess(true);
    setSelectedUserId('');
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-indigo-600" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">User Account (Login)</h3>
      </div>

      {/* Current status */}
      {isLinked ? (
        <div className="flex items-center gap-2.5 p-3 bg-green-50 rounded-xl border border-green-100 mb-4">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">Account linked</p>
            <p className="text-xs text-green-600 truncate">
              {linkedUser!.firstName} {linkedUser!.lastName} · {linkedUser!.email}
            </p>
          </div>
        </div>
      ) : teacher.email ? (
        <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100 mb-4">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Email set but no matching user</p>
            <p className="text-xs text-amber-600">{teacher.email} — create a user with this email, or link below</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
          <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-500">No user account linked — teacher cannot log in</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100 mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p className="text-sm font-semibold text-green-800">Account linked! Teacher can now log in.</p>
        </div>
      )}

      {/* Link form */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-medium">
          {isLinked ? 'Change linked account:' : 'Select a teacher-role user to link:'}
        </p>

        <div className="relative">
          {usersLoading ? (
            <div className="h-11 bg-gray-50 rounded-xl border border-gray-200 flex items-center px-3 gap-2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-400">Loading users…</span>
            </div>
          ) : teacherUsers.length === 0 ? (
            <div className="h-11 bg-gray-50 rounded-xl border border-gray-200 flex items-center px-3">
              <span className="text-sm text-gray-400">
                No teacher-role users found — create one in Administration → Users
              </span>
            </div>
          ) : (
            <>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-200 pl-3 pr-9 text-sm text-gray-700
                           bg-white appearance-none focus:outline-none focus:border-indigo-400
                           focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                disabled={isPending}
              >
                <option value="">Select user account…</option>
                {teacherUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                    {u.email === teacher.email ? ' ✓ currently linked' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600">{(error as Error).message}</p>
        )}

        <button
          onClick={handleLink}
          disabled={!selectedUserId || isPending}
          className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                     text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Linking…</>
          ) : (
            <><Link2 className="w-4 h-4" /> Link Account</>
          )}
        </button>
      </div>
    </div>
  );
}
