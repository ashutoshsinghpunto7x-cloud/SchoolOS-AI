import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOpsUsersScreen, useOpsSchools } from '../hooks/useOpsData';
import {
  useFeatureFlagDetail,
  useFeatureFlagAssignments,
  useUpdateFeatureFlag,
  useDeleteFeatureFlag,
  useRollbackFeatureFlag,
  useCreateAssignment,
  useDeleteAssignment,
} from '../hooks/useFeatureFlags';
import type { FeatureStatus, FeatureVisibilityMode, FeatureAssignmentTargetType } from '../api/featureFlagsApi';
import { extractErrorMessage } from '@/services/api';

const STATUS_OPTIONS: { value: FeatureStatus; label: string }[] = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'enabled', label: 'Enabled' },
  { value: 'beta', label: 'Beta' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'deprecated', label: 'Deprecated' },
];

const inputClass =
  'w-full rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm text-[#F4F6F8] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50';

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

export function OpsFeatureFlagDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'super_admin';

  const { data: feature, isLoading, isError } = useFeatureFlagDetail(key);
  const { data: assignments } = useFeatureFlagAssignments(key);
  const updateMutation = useUpdateFeatureFlag(key ?? '');
  const deleteMutation = useDeleteFeatureFlag();
  const rollbackMutation = useRollbackFeatureFlag(key ?? '');
  const createAssignmentMutation = useCreateAssignment(key ?? '');
  const deleteAssignmentMutation = useDeleteAssignment(key ?? '');

  const { data: usersScreen } = useOpsUsersScreen();
  const { data: schools } = useOpsSchools();

  const [error, setError] = useState('');
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetType, setTargetType] = useState<FeatureAssignmentTargetType>('user');
  const [targetId, setTargetId] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (isError || !feature) {
    return <div className="text-sm text-[#EF4444]">Feature not found.</div>;
  }

  const patch = (input: Parameters<typeof updateMutation.mutate>[0]) => {
    setError('');
    updateMutation.mutate(input, { onError: (err) => setError(extractErrorMessage(err)) });
  };

  const addAssignment = () => {
    if (!targetId.trim()) return;
    setError('');
    createAssignmentMutation.mutate(
      { targetType, targetId: targetId.trim() },
      { onSuccess: () => setTargetId(''), onError: (err) => setError(extractErrorMessage(err)) },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/ops/feature-flags" className="inline-flex items-center gap-1 text-sm text-[#98A2B3] hover:text-[#F4F6F8]">
          <ArrowLeft className="h-4 w-4" /> Back to Feature Management
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F4F6F8]">{feature.name}</h1>
          <p className="mt-1 font-mono text-xs text-[#64748B]">{feature.key}</p>
          {feature.description && <p className="mt-2 max-w-2xl text-sm text-[#98A2B3]">{feature.description}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setShowRollbackConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm font-medium text-[#EF4444]"
            >
              <ShieldAlert className="h-4 w-4" /> Emergency Rollback
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#232D38] px-3 py-2 text-sm text-[#98A2B3] hover:text-[#F4F6F8]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}

      <section className="rounded-2xl border border-[#232D38] bg-[#121922] p-4 sm:p-5">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              value={feature.status}
              disabled={!canManage}
              onChange={(e) => patch({ status: e.target.value as FeatureStatus })}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Version">
            <input
              defaultValue={feature.version ?? ''}
              disabled={!canManage}
              onBlur={(e) => e.target.value !== (feature.version ?? '') && patch({ version: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Created By">
            <div className="py-2 text-sm text-[#F4F6F8]">{feature.createdBy}</div>
          </Field>
          <Field label="Last Updated">
            <div className="py-2 text-sm text-[#F4F6F8]">{new Date(feature.updatedAt).toLocaleString()}</div>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[#232D38] bg-[#121922] p-4 sm:p-5">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Visible To</h2>
        <div className="flex flex-wrap gap-4">
          {(['nobody', 'everyone', 'custom'] as FeatureVisibilityMode[]).map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm text-[#F4F6F8]">
              <input
                type="radio"
                name="visibilityMode"
                checked={feature.visibilityMode === mode}
                disabled={!canManage}
                onChange={() => patch({ visibilityMode: mode })}
              />
              {mode === 'nobody' ? 'Nobody' : mode === 'everyone' ? 'Everyone' : 'Custom targeting'}
            </label>
          ))}
        </div>

        {feature.visibilityMode === 'custom' && (
          <div className="mt-5 space-y-5">
            <Field label={`Percentage Rollout (${feature.rolloutPercentage}%)`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                defaultValue={feature.rolloutPercentage}
                disabled={!canManage}
                onMouseUp={(e) => patch({ rolloutPercentage: Number((e.target as HTMLInputElement).value) })}
                onTouchEnd={(e) => patch({ rolloutPercentage: Number((e.target as HTMLInputElement).value) })}
                className="w-full"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Enable From">
                <input
                  type="datetime-local"
                  defaultValue={toDateInputValue(feature.enableFrom)}
                  disabled={!canManage}
                  onBlur={(e) => patch({ enableFrom: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className={inputClass}
                />
              </Field>
              <Field label="Disable On">
                <input
                  type="datetime-local"
                  defaultValue={toDateInputValue(feature.disableOn)}
                  disabled={!canManage}
                  onBlur={(e) => patch({ disableOn: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className={inputClass}
                />
              </Field>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[#98A2B3]">Assignments</h3>
              {canManage && (
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <select value={targetType} onChange={(e) => setTargetType(e.target.value as FeatureAssignmentTargetType)} className={`${inputClass} sm:w-40`}>
                    <option value="user">Selected User</option>
                    <option value="role">Selected Role</option>
                    <option value="school">Selected School</option>
                    <option value="segment">Segment</option>
                  </select>

                  {targetType === 'role' ? (
                    <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
                      <option value="">Choose a role…</option>
                      {usersScreen?.roles.map((r) => (
                        <option key={r.role} value={r.role}>{r.label}</option>
                      ))}
                    </select>
                  ) : targetType === 'school' ? (
                    <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
                      <option value="">Choose a school…</option>
                      {schools?.map((s) => (
                        <option key={s.schoolId} value={s.schoolId}>{s.schoolName}</option>
                      ))}
                    </select>
                  ) : targetType === 'segment' ? (
                    <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
                      <option value="">Choose a segment…</option>
                      <option value="developers">Developers</option>
                      <option value="internal_testers">Internal Testers</option>
                    </select>
                  ) : (
                    <input
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      placeholder="User ID"
                      list="ops-users-datalist"
                      className={inputClass}
                    />
                  )}
                  {targetType === 'user' && (
                    <datalist id="ops-users-datalist">
                      {usersScreen?.users.map((u) => (
                        <option key={u.id} value={u.id}>{`${u.firstName} ${u.lastName} (${u.email})`}</option>
                      ))}
                    </datalist>
                  )}

                  <button
                    onClick={addAssignment}
                    disabled={!targetId.trim() || createAssignmentMutation.isPending}
                    className="shrink-0 rounded-md bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                {(assignments ?? []).length === 0 && <p className="text-sm text-[#64748B]">No assignments yet — no one has custom access.</p>}
                {(assignments ?? []).map((a) => (
                  <div key={a._id} className="flex items-center justify-between rounded-md border border-[#232D38] bg-[#0B0F14] px-3 py-2 text-sm">
                    <span className="text-[#F4F6F8]">
                      <span className="text-[#64748B]">{a.targetType}:</span> {a.targetId}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => deleteAssignmentMutation.mutate(a._id)}
                        className="text-xs text-[#98A2B3] hover:text-[#EF4444]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {showRollbackConfirm && (
        <ConfirmModal
          title="Emergency Rollback"
          message={`This immediately disables "${feature.name}" for everyone — no redeploy needed. You can re-enable it later.`}
          confirmLabel="Disable Now"
          danger
          isPending={rollbackMutation.isPending}
          onCancel={() => setShowRollbackConfirm(false)}
          onConfirm={() => rollbackMutation.mutate(undefined, { onSuccess: () => setShowRollbackConfirm(false) })}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Feature"
          message={`This permanently deletes "${feature.name}" and all of its assignments.`}
          confirmLabel="Delete"
          danger
          isPending={deleteMutation.isPending}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => deleteMutation.mutate(feature.key, { onSuccess: () => navigate('/ops/feature-flags') })}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-[#98A2B3]">{label}</span>
      {children}
    </label>
  );
}

function ConfirmModal({
  title, message, confirmLabel, danger, isPending, onCancel, onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#232D38] bg-[#121922] p-6">
        <h2 className="text-base font-semibold text-[#F4F6F8]">{title}</h2>
        <p className="mt-2 text-sm text-[#98A2B3]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-[#232D38] px-3 py-1.5 text-sm text-[#98A2B3] hover:text-[#F4F6F8]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 ${danger ? 'bg-[#EF4444]' : 'bg-[#3B82F6]'}`}
          >
            {isPending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
