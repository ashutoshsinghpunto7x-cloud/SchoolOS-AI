import type { UserRole } from '@schoolos/types';

const CONFIG: Record<UserRole, { label: string; className: string }> = {
  admin: { label: 'Administrator', className: 'bg-purple-100 text-purple-700' },
  principal: { label: 'Principal', className: 'bg-indigo-100 text-indigo-700' },
  reception: { label: 'Receptionist', className: 'bg-blue-100 text-blue-700' },
  teacher: { label: 'Teacher', className: 'bg-green-100 text-green-700' },
  accountant: { label: 'Accountant', className: 'bg-amber-100 text-amber-700' },
};

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const { label, className } = CONFIG[role] ?? {
    label: role,
    className: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
};
