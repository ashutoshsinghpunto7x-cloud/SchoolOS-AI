import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';
import type { LeaveType } from '@schoolos/types';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';
import { useCreateLeaveRequest } from '../hooks';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const LEAVE_TYPE_OPTIONS: { label: string; value: LeaveType }[] = [
  { label: 'Full day', value: 'full_day' },
  { label: 'Half day', value: 'half_day' },
];

// Mirrors the backend's createLeaveRequestSchema refinements exactly
// (dateTo >= dateFrom; half_day requires a single date) so invalid
// requests are caught client-side before hitting the API.
const schema = z
  .object({
    leaveType: z.enum(['full_day', 'half_day']),
    dateFrom: z.string().regex(DATE_REGEX, 'Use YYYY-MM-DD'),
    dateTo: z.string().regex(DATE_REGEX, 'Use YYYY-MM-DD'),
    reason: z.string().min(1, 'Reason is required').max(500),
  })
  .refine((data) => data.dateTo >= data.dateFrom, { message: 'End date must be on or after start date', path: ['dateTo'] })
  .refine((data) => data.leaveType !== 'half_day' || data.dateFrom === data.dateTo, {
    message: 'Half-day leave must be a single date',
    path: ['dateTo'],
  });

type FormValues = z.infer<typeof schema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ApplyLeaveScreen() {
  const { colors, spacing, typography } = useTheme();
  const createLeave = useCreateLeaveRequest();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leaveType: 'full_day', dateFrom: todayIso(), dateTo: todayIso(), reason: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await createLeave.mutateAsync(values);
      router.back();
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <Text style={[typography.title, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.lg }]}>
        Apply for leave
      </Text>

      <Controller
        control={control}
        name="leaveType"
        render={({ field }) => (
          <SegmentedControl label="Type" options={LEAVE_TYPE_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />

      <Controller
        control={control}
        name="dateFrom"
        render={({ field }) => (
          <TextField label="From (YYYY-MM-DD)" value={field.value} onChangeText={field.onChange} error={errors.dateFrom?.message} />
        )}
      />
      <Controller
        control={control}
        name="dateTo"
        render={({ field }) => (
          <TextField label="To (YYYY-MM-DD)" value={field.value} onChangeText={field.onChange} error={errors.dateTo?.message} />
        )}
      />
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <TextField
            label="Reason"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.reason?.message}
            multiline
            style={{ height: 88, paddingTop: 12, textAlignVertical: 'top' }}
          />
        )}
      />

      {serverError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{serverError}</Text>
      ) : null}

      <Button label="Submit request" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </ScreenContainer>
  );
}
