import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Loader2, AlertCircle, Mail, Phone, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useUser, useChangeStatus, useDeleteUser } from '../hooks/useUsers';
import { RoleBadge } from '../components/RoleBadge';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { UserStatus } from '@schoolos/types';

const STATUS_TRANSITIONS: Record<UserStatus, { next: UserStatus; label: string; variant: 'danger' | 'warning' }[]> = {
  active: [{ next: 'suspended', label: 'Suspend User', variant: 'danger' }, { next: 'inactive', label: 'Deactivate', variant: 'warning' }],
  inactive: [{ next: 'active', label: 'Activate User', variant: 'warning' }],
  suspended: [{ next: 'active', label: 'Reinstate User', variant: 'warning' }],
};

export const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: user, isLoading, isError } = useUser(id ?? '');
  const { mutateAsync: changeStatus, isPending: isChangingStatus } = useChangeStatus();
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();

  const [pendingStatus, setPendingStatus] = useState<UserStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isSelf = user?._id === currentUser?.userId;

  const handleStatusChange = async () => {
    if (!pendingStatus || !id) return;
    try {
      await changeStatus({ id, payload: { status: pendingStatus } });
      toast.success('User status updated');
    } catch (err) {
      toast.error('Failed to update status', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setPendingStatus(null);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteUser(id);
      toast.success('User removed');
      navigate('/administration/users');
    } catch (err) {
      toast.error('Failed to remove user', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer narrow>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !user) {
    return (
      <PageContainer narrow>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-base font-medium text-gray-700">User not found</p>
          <button
            onClick={() => navigate('/administration/users')}
            className="text-sm text-blue-600 hover:underline"
            type="button"
          >
            Back to Users
          </button>
        </div>
      </PageContainer>
    );
  }

  const transitions = STATUS_TRANSITIONS[user.status] ?? [];
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <PageContainer narrow>
      {/* Back */}
      <button
        onClick={() => navigate('/administration/users')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-[#5B21B6] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xl font-bold text-white">{initials}</span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                  {isSelf && (
                    <span className="ml-2 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 rounded px-1.5 py-0.5 align-middle">
                      You
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <RoleBadge role={user.role} />
                  <UserStatusBadge status={user.status} />
                </div>
              </div>

              {!isSelf && (
                <button
                  onClick={() => navigate(`/administration/users/${id}/edit`)}
                  className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700
                             hover:bg-gray-50 flex items-center gap-2 transition-colors flex-shrink-0"
                  type="button"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            {/* Contact info */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.lastLoginAt && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Last login: {new Date(user.lastLoginAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions panel — hidden for self */}
      {!isSelf && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">Account Actions</h2>
          <div className="flex flex-wrap gap-3">
            {transitions.map((t) => (
              <button
                key={t.next}
                onClick={() => setPendingStatus(t.next)}
                disabled={isChangingStatus || isDeleting}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700
                           hover:bg-gray-50 transition-colors disabled:opacity-50"
                type="button"
              >
                {t.label}
              </button>
            ))}

            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isChangingStatus || isDeleting}
              className="h-10 px-4 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600
                         hover:bg-red-100 transition-colors disabled:opacity-50 ml-auto"
              type="button"
            >
              Remove User
            </button>
          </div>
        </div>
      )}

      {/* Status change confirm */}
      {pendingStatus && (
        <ConfirmDialog
          title="Change User Status"
          description={`Are you sure you want to set ${user.firstName} ${user.lastName}'s status to "${pendingStatus}"?`}
          confirmLabel="Confirm"
          variant={pendingStatus === 'active' ? 'warning' : 'danger'}
          isLoading={isChangingStatus}
          onConfirm={() => void handleStatusChange()}
          onCancel={() => setPendingStatus(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmDialog
          title="Remove User"
          description={`Are you sure you want to permanently remove ${user.firstName} ${user.lastName}? This cannot be undone.`}
          confirmLabel="Remove"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </PageContainer>
  );
};
