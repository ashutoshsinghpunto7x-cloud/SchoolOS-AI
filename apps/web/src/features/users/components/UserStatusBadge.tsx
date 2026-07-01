import type { UserStatus } from '@schoolos/types';

const CONFIG: Record<UserStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-500' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-600' },
};

interface UserStatusBadgeProps {
  status: UserStatus;
}

export const UserStatusBadge = ({ status }: UserStatusBadgeProps) => {
  const { label, className } = CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
};
