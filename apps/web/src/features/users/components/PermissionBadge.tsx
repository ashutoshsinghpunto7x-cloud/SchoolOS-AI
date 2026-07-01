import type { Permission } from '@schoolos/types';

const CATEGORY_COLORS: Record<string, string> = {
  Users: 'bg-purple-50 text-purple-700 border-purple-200',
  Students: 'bg-blue-50 text-blue-700 border-blue-200',
  Communications: 'bg-green-50 text-green-700 border-green-200',
  Administration: 'bg-amber-50 text-amber-700 border-amber-200',
};

const PERMISSION_CATEGORY: Record<Permission, string> = {
  'users.view': 'Users',
  'users.create': 'Users',
  'users.update': 'Users',
  'students.view': 'Students',
  'students.create': 'Students',
  'students.update': 'Students',
  'communications.view': 'Communications',
  'communications.create': 'Communications',
  'administration.manage': 'Administration',
};

const PERMISSION_LABEL: Record<Permission, string> = {
  'users.view': 'View Users',
  'users.create': 'Create Users',
  'users.update': 'Update Users',
  'students.view': 'View Students',
  'students.create': 'Admit Students',
  'students.update': 'Update Students',
  'communications.view': 'View Comms',
  'communications.create': 'Send Comms',
  'administration.manage': 'Manage Admin',
};

interface PermissionBadgeProps {
  permission: Permission;
}

export const PermissionBadge = ({ permission }: PermissionBadgeProps) => {
  const category = PERMISSION_CATEGORY[permission] ?? 'General';
  const label = PERMISSION_LABEL[permission] ?? permission;
  const colorCls = CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${colorCls}`}
    >
      {label}
    </span>
  );
};
