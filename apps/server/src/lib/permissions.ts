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
  EXAMS_VIEW: 'exams.view',
  EXAMS_CONFIGURE: 'exams.configure',
  MARKS_ENTER: 'marks.enter',
  MARKS_SUBMIT: 'marks.submit',
  MARKS_APPROVE: 'marks.approve',
  MARKS_PUBLISH: 'marks.publish',
  OPS_VIEW: 'ops.view',
  FEATURE_FLAGS_VIEW: 'feature-flags.view',
  FEATURE_FLAGS_MANAGE: 'feature-flags.manage',
  MAINTENANCE_VIEW: 'maintenance.view',
  MAINTENANCE_MANAGE: 'maintenance.manage',
  MODULE_ACCESS_VIEW: 'module-access.view',
  MODULE_ACCESS_MANAGE: 'module-access.manage',
  VISITORS_MANAGE: 'visitors.manage',
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
    'visitors.manage',
  ],
  teacher: ['students.view', 'communications.view', 'exams.view', 'marks.enter', 'marks.submit'],
  accountant: ['students.view', 'payroll.view'],
  // Internal SchoolOS staff — Ops Center only, no tenant-facing permissions.
  // Feature-flag management (create/delete/rollout/global toggle) is reserved
  // for owner/super_admin; the rest of Ops staff can only view flag status.
  owner: ['ops.view', 'feature-flags.view', 'feature-flags.manage', 'maintenance.view', 'maintenance.manage', 'module-access.view', 'module-access.manage'],
  super_admin: ['ops.view', 'feature-flags.view', 'feature-flags.manage', 'maintenance.view', 'maintenance.manage', 'module-access.view', 'module-access.manage'],
  devops: ['ops.view', 'feature-flags.view', 'maintenance.view', 'module-access.view'],
  developer: ['ops.view', 'feature-flags.view', 'maintenance.view', 'module-access.view'],
  support: ['ops.view', 'feature-flags.view', 'maintenance.view', 'module-access.view'],
};

export const ROLE_META: Record<UserRole, { label: string; description: string }> = {
  admin: { label: 'Administrator', description: 'Full access to all system features' },
  principal: { label: 'Principal', description: 'School oversight — timetable, attendance, leave approvals, and staff' },
  reception: { label: 'Receptionist', description: 'Student admissions and communication' },
  teacher: { label: 'Teacher', description: 'View students and communications' },
  accountant: { label: 'Accountant', description: 'Fee collection, salary, and expense management' },
  owner: { label: 'Owner', description: 'SchoolOS platform owner — Ops Center access' },
  super_admin: { label: 'Super Admin', description: 'SchoolOS platform super admin — Ops Center access' },
  devops: { label: 'DevOps', description: 'SchoolOS infrastructure engineer — Ops Center access' },
  developer: { label: 'Developer', description: 'SchoolOS developer — Ops Center access' },
  support: { label: 'Support', description: 'SchoolOS support engineer — Ops Center access' },
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
  'exams.view': { label: 'View Exams', category: 'Marks & Report Cards' },
  'exams.configure': { label: 'Configure Exams', category: 'Marks & Report Cards' },
  'marks.enter': { label: 'Enter Marks', category: 'Marks & Report Cards' },
  'marks.submit': { label: 'Submit Marks for Review', category: 'Marks & Report Cards' },
  'marks.approve': { label: 'Approve / Publish Marks', category: 'Marks & Report Cards' },
  'marks.publish': { label: 'Publish Report Cards', category: 'Marks & Report Cards' },
  'ops.view': { label: 'View Ops Center', category: 'Ops Center' },
  'feature-flags.view': { label: 'View Feature Flags', category: 'Feature Flags' },
  'feature-flags.manage': { label: 'Manage Feature Flags', category: 'Feature Flags' },
  'maintenance.view': { label: 'View Maintenance Mode', category: 'Maintenance' },
  'maintenance.manage': { label: 'Manage Maintenance Mode', category: 'Maintenance' },
  'module-access.view': { label: 'View Module Access', category: 'Module Access' },
  'module-access.manage': { label: 'Manage Module Access', category: 'Module Access' },
  'visitors.manage': { label: 'Manage Visitor Log', category: 'Front Desk' },
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
