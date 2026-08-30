import type { UserRole } from '@schoolos/types';

const CONFIG: Record<UserRole, { label: string; className: string }> = {
  admin: { label: 'Administrator', className: 'bg-purple-100 text-purple-700' },
  principal: { label: 'Principal', className: 'bg-indigo-100 text-indigo-700' },
  incharge: { label: 'Incharge', className: 'bg-indigo-100 text-indigo-700' },
  reception: { label: 'Receptionist', className: 'bg-blue-100 text-blue-700' },
  teacher: { label: 'Teacher', className: 'bg-green-100 text-green-700' },
  accountant: { label: 'Accountant', className: 'bg-amber-100 text-amber-700' },
  parent: { label: 'Parent', className: 'bg-pink-100 text-pink-700' },
  driver: { label: 'Driver', className: 'bg-teal-100 text-teal-700' },
  owner: { label: 'Owner', className: 'bg-slate-100 text-slate-700' },
  super_admin: { label: 'Super Admin', className: 'bg-slate-100 text-slate-700' },
  devops: { label: 'DevOps', className: 'bg-slate-100 text-slate-700' },
  developer: { label: 'Developer', className: 'bg-slate-100 text-slate-700' },
  support: { label: 'Support', className: 'bg-slate-100 text-slate-700' },
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
