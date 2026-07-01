import type { UserRole, UserStatus } from '@schoolos/types';

interface UserFiltersProps {
  role: UserRole | '';
  status: UserStatus | '';
  onRoleChange: (role: UserRole | '') => void;
  onStatusChange: (status: UserStatus | '') => void;
}

export const UserFilters = ({
  role,
  status,
  onRoleChange,
  onStatusChange,
}: UserFiltersProps) => {
  const selectCls =
    'h-11 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium ' +
    'shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ' +
    'transition-colors appearance-none cursor-pointer hover:border-gray-300';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value as UserRole | '')}
        className={selectCls}
        aria-label="Filter by role"
      >
        <option value="">All Roles</option>
        <option value="admin">Administrator</option>
        <option value="reception">Receptionist</option>
        <option value="teacher">Teacher</option>
        <option value="accountant">Accountant</option>
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as UserStatus | '')}
        className={selectCls}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>
  );
};
