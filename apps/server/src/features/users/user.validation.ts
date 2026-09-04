import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  email: z.string().email().toLowerCase(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'principal', 'reception', 'teacher', 'accountant', 'operations_manager', 'academic_coordinator', 'parent']),
  /** Parent role only — Student._id values this account may view. */
  linkedStudentIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(50).trim().optional(),
    lastName: z.string().min(1).max(50).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(['admin', 'principal', 'reception', 'teacher', 'accountant', 'academic_coordinator', 'parent']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    linkedStudentIds: z.array(z.string()).optional(),
  })
  .strict();

/** Bulk-creates one Parent Workspace login per selected student, sharing a
 *  single admin-set password across the batch. Email/username are always
 *  generated server-side (from the student's parentEmail if present, else
 *  a synthetic address) — never taken from client input, per student. */
export const bulkCreateParentsSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'Select at least one student'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const statusChangeSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

/** Admin-issued login credentials for a staff member who has no self-signup
 *  flow (e.g. an imported teacher) — `loginEmail` is an admin-generated school
 *  address (e.g. jsmith@fnic.com) used purely to sign in, kept separate from
 *  the teacher's own contact email from their documents. */
export const createTeacherLoginSchema = z.object({
  loginEmail: z.string().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/** Changes just the login email of an existing teacher login, keeping the
 *  same password/account — used to fix a mis-generated login address. */
export const updateTeacherLoginEmailSchema = z.object({
  loginEmail: z.string().email('Enter a valid email address').toLowerCase(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
