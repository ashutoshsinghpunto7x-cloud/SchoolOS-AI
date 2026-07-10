import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  email: z.string().email().toLowerCase(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'principal', 'reception', 'teacher', 'accountant']),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(50).trim().optional(),
    lastName: z.string().min(1).max(50).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(['admin', 'principal', 'reception', 'teacher', 'accountant']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  })
  .strict();

export const statusChangeSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
