import { useState } from 'react';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RoleBadge } from './RoleBadge';
import { UserStatusBadge } from './UserStatusBadge';
import { useDeleteUser } from '../hooks/useUsers';
import type { User } from '@schoolos/types';

interface UserCardProps {
  user: User;
  isSelf: boolean;
}

export const UserCard = ({ user, isSelf }: UserCardProps) => {
  const navigate = useNavigate();
  const { mutateAsync: deleteUser, isPending } = useDeleteUser();
  const [confirming, setConfirming] = useState(false);

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  const handleDelete = async () => {
    try {
      await deleteUser(user._id);
      toast.success(`${user.firstName} ${user.lastName} removed`);
    } catch (err) {
      toast.error('Failed to remove user', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-base font-bold text-white">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-gray-900 truncate">
              {user.firstName} {user.lastName}
            </span>
            {isSelf && (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 rounded px-1.5 py-0.5">
                You
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <RoleBadge role={user.role} />
            <UserStatusBadge status={user.status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/administration/users/${user._id}`)}
            className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200
                       flex items-center justify-center transition-colors"
            type="button"
            aria-label="View user"
          >
            <Eye className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => navigate(`/administration/users/${user._id}/edit`)}
            className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200
                       flex items-center justify-center transition-colors"
            type="button"
            aria-label="Edit user"
          >
            <Pencil className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={isSelf}
            className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100
                       flex items-center justify-center transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
            aria-label="Delete user"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Remove User"
          description={`Are you sure you want to remove ${user.firstName} ${user.lastName}? This action cannot be undone.`}
          confirmLabel="Remove"
          variant="danger"
          isLoading={isPending}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
};
