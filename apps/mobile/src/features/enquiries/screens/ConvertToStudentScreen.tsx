import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';
import type { Gender } from '@schoolos/types';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';
import { useConvertEnquiry, useEnquiry } from '../hooks';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const schema = z.object({
  class: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  fatherName: z.string().min(1, "Father's name is required"),
  motherName: z.string().min(1, "Mother's name is required"),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// Mirrors the web app's ConvertToStudentModal: same required fields, same
// endpoint (POST /enquiries/:id/convert) — this creates a real Student
// record and links it back to the enquiry, it does not duplicate that logic.
export function ConvertToStudentScreen() {
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const enquiryQuery = useEnquiry(id ?? '');
  const convertEnquiry = useConvertEnquiry(id ?? '');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      class: enquiryQuery.data?.interestedClass ?? '',
      section: '',
      gender: enquiryQuery.data?.gender ?? 'male',
      dateOfBirth: enquiryQuery.data?.studentDateOfBirth ?? '',
      fatherName: '',
      motherName: '',
      address: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await convertEnquiry.mutateAsync({
        class: values.class,
        section: values.section,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
        fatherName: values.fatherName,
        motherName: values.motherName,
        address: values.address || undefined,
      });
      router.replace({ pathname: '/(app)/admissions/[id]', params: { id: id ?? '' } });
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  if (enquiryQuery.isLoading) {
    return (
      <ScreenContainer>
        <Skeleton style={{ height: 300, borderRadius: 16 }} />
      </ScreenContainer>
    );
  }

  if (enquiryQuery.isError || !enquiryQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState error={enquiryQuery.error} onRetry={() => enquiryQuery.refetch()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.xs }]}>Convert to student</Text>
      <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.lg }]}>
        {enquiryQuery.data.studentName}
      </Text>

      <Controller
        control={control}
        name="class"
        render={({ field }) => (
          <TextField label="Class" value={field.value} onChangeText={field.onChange} error={errors.class?.message} />
        )}
      />
      <Controller
        control={control}
        name="section"
        render={({ field }) => (
          <TextField label="Section" value={field.value} onChangeText={field.onChange} error={errors.section?.message} />
        )}
      />
      <Controller
        control={control}
        name="gender"
        render={({ field }) => (
          <SegmentedControl label="Gender" options={GENDER_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field }) => (
          <TextField
            label="Date of birth"
            placeholder="YYYY-MM-DD"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.dateOfBirth?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="fatherName"
        render={({ field }) => (
          <TextField label="Father's name" value={field.value} onChangeText={field.onChange} error={errors.fatherName?.message} />
        )}
      />
      <Controller
        control={control}
        name="motherName"
        render={({ field }) => (
          <TextField label="Mother's name" value={field.value} onChangeText={field.onChange} error={errors.motherName?.message} />
        )}
      />
      <Controller
        control={control}
        name="address"
        render={({ field }) => <TextField label="Address (optional)" value={field.value} onChangeText={field.onChange} multiline />}
      />

      {serverError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{serverError}</Text>
      ) : null}

      <Button label="Convert to student" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </ScreenContainer>
  );
}
