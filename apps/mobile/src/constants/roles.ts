import type { UserRole } from '@schoolos/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  principal: 'Principal',
  reception: 'Reception',
  teacher: 'Teacher',
  accountant: 'Accountant',
};

// Roles allowed to record fee payments / view full collection tools.
// Mirrors the backend's authorize('admin', 'principal', 'accountant') /
// authorize('admin', 'accountant') gates on the fees routes — the app only
// reflects this to pick the right UI, the server remains the enforcement point.
export const FEE_COLLECTOR_ROLES: readonly UserRole[] = ['admin', 'accountant', 'reception'];

export const canRecordFeePayments = (role: UserRole): boolean => FEE_COLLECTOR_ROLES.includes(role);

// Roles that can see the Teacher Directory and edit teacher records.
// Mirrors the backend's authorize('admin', 'principal', 'reception') gate on
// PATCH /teachers/:id — the app only reflects this, the server enforces it.
export const TEACHER_MANAGER_ROLES: readonly UserRole[] = ['admin', 'principal', 'reception'];

export const canManageTeachers = (role: UserRole): boolean => TEACHER_MANAGER_ROLES.includes(role);

// Mirrors authorize('admin', 'reception', 'accountant') on the teacher photo routes.
export const TEACHER_PHOTO_MANAGER_ROLES: readonly UserRole[] = ['admin', 'reception', 'accountant'];

export const canManageTeacherPhoto = (role: UserRole): boolean => TEACHER_PHOTO_MANAGER_ROLES.includes(role);

// Any staff role can browse the read-only Teacher Directory; only `teacher`
// gets "My Workspace" instead (they view their own record, not the roster).
export const canViewTeacherDirectory = (role: UserRole): boolean => role !== 'teacher';

// Roles that see the Admissions (Enquiries) entry point on the dashboard.
// The backend leaves /enquiries open to any authenticated role (only delete
// is admin-gated), but the web app's sidebar only surfaces "Admissions" to
// back-office staff — mirroring that scope rather than the wider backend grant.
export const ADMISSIONS_ROLES: readonly UserRole[] = ['admin', 'principal', 'reception'];

export const canManageAdmissions = (role: UserRole): boolean => ADMISSIONS_ROLES.includes(role);
