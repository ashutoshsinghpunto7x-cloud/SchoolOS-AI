import type { EmploymentStatus } from '@schoolos/types';

export const EMPLOYMENT_STATUS_TONE: Record<EmploymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  on_leave: 'warning',
  suspended: 'danger',
  applicant: 'neutral',
  resigned: 'neutral',
  retired: 'neutral',
  inactive: 'neutral',
};

export const EMPLOYMENT_STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: 'Active',
  on_leave: 'On leave',
  suspended: 'Suspended',
  applicant: 'Applicant',
  resigned: 'Resigned',
  retired: 'Retired',
  inactive: 'Inactive',
};
