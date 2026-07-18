import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';
import type { Gender } from '@schoolos/types';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';
import { useCreateStudent } from '../hooks';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  class: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// Mirrors the web app's NewAdmissionPage: a direct student-creation form
// (POST /students), separate from the enquiry-conversion flow — matches the
// "New Admission" quick action on web's Reception dashboard exactly.
export function NewAdmissionScreen() {
  const { colors, spacing, typography } = useTheme();
  const createStudent = useCreateStudent();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      class: '',
      section: '',
      gender: 'male',
      dateOfBirth: '',
      fatherName: '',
      motherName: '',
      parentPhone: '',
      address: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await createStudent.mutateAsync({
        fullName: values.fullName,
        class: values.class,
        section: values.section,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth || undefined,
        fatherName: values.fatherName || undefined,
        motherName: values.motherName || undefined,
        parentPhone: values.parentPhone || undefined,
        address: values.address || undefined,
      });
      router.back();
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>New admission</Text>

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField label="Student full name" value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />
        )}
      />
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
          <TextField label="Date of birth" placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="fatherName"
        render={({ field }) => <TextField label="Father's name" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="motherName"
        render={({ field }) => <TextField label="Mother's name" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="parentPhone"
        render={({ field }) => <TextField label="Parent phone" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="address"
        render={({ field }) => <TextField label="Address" value={field.value} onChangeText={field.onChange} multiline />}
      />

      {serverError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{serverError}</Text>
      ) : null}

      <Button label="Create student" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </ScreenContainer>
  );
}
