import { z } from 'zod';

export const submitRecoveryRequestSchema = z.object({
  schoolId: z.string({ required_error: 'School ID is required' }).min(1).trim(),
  employeeId: z.string({ required_error: 'Employee/Staff ID is required' }).min(1).trim(),
  email: z.string({ required_error: 'Registered email is required' }).email('Enter a valid email address'),
});

export const rejectRecoveryRequestSchema = z.object({
  reason: z.string().max(500).trim().optional(),
});

export const setNewPasswordSchema = z.object({
  newPassword: z.string({ required_error: 'New password is required' }).min(8, 'Password must be at least 8 characters'),
});

export const setPinSchema = z.object({
  pin: z.string({ required_error: 'PIN is required' }).regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export const loginWithPinSchema = z.object({
  deviceId: z.string({ required_error: 'deviceId is required' }).min(1),
  pin: z.string({ required_error: 'PIN is required' }).regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export const setupPinSchema = z.object({
  pin: z.string({ required_error: 'PIN is required' }).regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  deviceLabel: z.string().max(200).trim().optional(),
});

export type SubmitRecoveryRequestInput = z.infer<typeof submitRecoveryRequestSchema>;
export type RejectRecoveryRequestInput = z.infer<typeof rejectRecoveryRequestSchema>;
export type SetNewPasswordInput = z.infer<typeof setNewPasswordSchema>;
export type SetPinInput = z.infer<typeof setPinSchema>;
export type LoginWithPinInput = z.infer<typeof loginWithPinSchema>;
export type SetupPinInput = z.infer<typeof setupPinSchema>;
