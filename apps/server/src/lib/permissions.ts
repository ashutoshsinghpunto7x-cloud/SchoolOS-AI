import type { UserRole } from '../features/users/user.model';

export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  STUDENTS_VIEW: 'students.view',
  STUDENTS_CREATE: 'students.create',
  STUDENTS_UPDATE: 'students.update',
  COMMUNICATIONS_VIEW: 'communications.view',
  COMMUNICATIONS_CREATE: 'communications.create',
  ADMINISTRATION_MANAGE: 'administration.manage',
  EMPLOYEE_MANAGE: 'employee.manage',
  EMPLOYEE_VIEW: 'employee.view',
  ATTENDANCE_QR_SCAN: 'attendance-qr.scan',
  ATTENDANCE_QR_VIEW: 'attendance-qr.view',
  PAYROLL_GENERATE: 'payroll.generate',
  PAYROLL_VIEW: 'payroll.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: Object.values(PERMISSIONS) as Permission[],
  principal: Object.values(PERMISSIONS) as Permission[],
  reception: [
    'students.view',
    'students.create',
    'students.update',
    'communications.view',
    'communications.create',
  ],
  teacher: ['students.view', 'communications.view'],
  accountant: ['students.view', 'payroll.view'],
};

export const ROLE_META: Record<UserRole, { label: string; description: string }> = {
  admin: { label: 'Administrator', description: 'Full access to all system features' },
  principal: { label: 'Principal', description: 'School oversight — timetable, attendance, leave approvals, and staff' },
  reception: { label: 'Receptionist', description: 'Student admissions and communication' },
  teacher: { label: 'Teacher', description: 'View students and communications' },
  accountant: { label: 'Accountant', description: 'Fee collection, salary, and expense management' },
};

export const PERMISSION_META: Record<Permission, { label: string; category: string }> = {
  'users.view': { label: 'View Users', category: 'Users' },
  'users.create': { label: 'Create Users', category: 'Users' },
  'users.update': { label: 'Update Users', category: 'Users' },
  'students.view': { label: 'View Students', category: 'Students' },
  'students.create': { label: 'Create Students', category: 'Students' },
  'students.update': { label: 'Update Students', category: 'Students' },
  'communications.view': { label: 'View Communications', category: 'Communications' },
  'communications.create': { label: 'Create Communications', category: 'Communications' },
  'administration.manage': { label: 'Manage Administration', category: 'Administration' },
  'employee.manage': { label: 'Manage Employees', category: 'Employees' },
  'employee.view': { label: 'View Employees', category: 'Employees' },
  'attendance-qr.scan': { label: 'Scan Staff Attendance QR', category: 'Staff Attendance' },
  'attendance-qr.view': { label: 'View Staff Attendance', category: 'Staff Attendance' },
  'payroll.generate': { label: 'Generate Payroll', category: 'Payroll' },
  'payroll.view': { label: 'View Payroll', category: 'Payroll' },
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
