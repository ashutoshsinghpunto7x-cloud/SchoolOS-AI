import { z } from 'zod';

// ── Shared rules ──────────────────────────────────────────────────────────────

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

export const EMPLOYEE_ROLES = [
  'teacher', 'principal', 'vice_principal', 'receptionist',
  'accountant', 'librarian', 'driver', 'peon', 'other',
] as const;

export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract'] as const;

export const EMPLOYEE_STATUSES = ['active', 'inactive'] as const;

// ── Create ────────────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  fullName:       z.string({ required_error: 'Full name is required' }).min(2).max(100).trim(),
  gender:         z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  dateOfBirth:    z.string().optional(),
  phone:          phoneSchema,
  alternatePhone: phoneSchema.optional().or(z.literal('')),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  address:        z.string().optional(),
  designation:    z.string({ required_error: 'Designation is required' }).min(1).max(100).trim(),
  department:     z.string().max(100).trim().optional(),
  joiningDate:    z.string().optional(),
  monthlySalary:  z.number().min(0).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  role:           z.enum(EMPLOYEE_ROLES, { required_error: 'Role is required' }),
  status:         z.enum(EMPLOYEE_STATUSES).default('active'),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

// ── List query ────────────────────────────────────────────────────────────────

export const listEmployeesSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  search:     z.string().optional(),
  department: z.string().optional(),
  role:       z.enum(EMPLOYEE_ROLES).optional(),
  status:     z.enum(EMPLOYEE_STATUSES).optional(),
  sortBy:     z.enum(['fullName', 'createdAt', 'joiningDate']).default('createdAt'),
  sortOrder:  z.enum(['asc', 'desc']).default('desc'),
});

// ── Login provisioning ────────────────────────────────────────────────────────

export const createEmployeeLoginSchema = z.object({
  username: z.string({ required_error: 'Username is required' }).min(3).max(50).trim().toLowerCase(),
  password: z.string({ required_error: 'Password is required' }).min(6).max(100),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateEmployeeInput      = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput      = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesInput       = z.infer<typeof listEmployeesSchema>;
export type CreateEmployeeLoginInput = z.infer<typeof createEmployeeLoginSchema>;
