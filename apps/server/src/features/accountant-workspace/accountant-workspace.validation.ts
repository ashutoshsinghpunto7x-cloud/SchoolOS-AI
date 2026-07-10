import { z } from 'zod';

export const sendDefaultersToTeacherSchema = z.object({
  class:     z.string({ required_error: 'class is required' }).min(1).trim(),
  section:   z.string({ required_error: 'section is required' }).min(1).trim(),
  teacherId: z.string({ required_error: 'teacherId is required' }).min(1),
});

export const sendReceiptEmailSchema = z.object({
  toEmail:        z.string({ required_error: 'toEmail is required' }).email('Enter a valid email address'),
  studentName:    z.string({ required_error: 'studentName is required' }).min(1).trim(),
  class:          z.string({ required_error: 'class is required' }).min(1).trim(),
  section:        z.string({ required_error: 'section is required' }).min(1).trim(),
  feeDescription: z.string({ required_error: 'feeDescription is required' }).min(1).trim(),
  amount:         z.number({ required_error: 'amount is required' }).positive(),
  paymentDate:    z.string({ required_error: 'paymentDate is required' }).min(1),
});

export type SendDefaultersToTeacherInput = z.infer<typeof sendDefaultersToTeacherSchema>;
export type SendReceiptEmailInput        = z.infer<typeof sendReceiptEmailSchema>;

export const studentLedgerParamsSchema = z.object({
  studentId: z.string({ required_error: 'studentId is required' }).min(1),
});

export type StudentLedgerParamsInput = z.infer<typeof studentLedgerParamsSchema>;

export const classFeeSummaryParamsSchema = z.object({
  class:   z.string({ required_error: 'class is required' }).min(1).trim(),
  section: z.string({ required_error: 'section is required' }).min(1).trim(),
});

export type ClassFeeSummaryParamsInput = z.infer<typeof classFeeSummaryParamsSchema>;
