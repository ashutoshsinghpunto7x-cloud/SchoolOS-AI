import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';
import type { EnquirySource, Gender } from '@schoolos/types';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';
import { useCreateEnquiry, useEnquiry, useUpdateEnquiry } from '../hooks';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const SOURCE_OPTIONS: { label: string; value: EnquirySource }[] = [
  { label: 'Walk-in', value: 'walk_in' },
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
  { label: 'Social', value: 'social_media' },
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
  { label: 'Other', value: 'other' },
];

const schema = z.object({
  studentName: z.string().min(1, 'Student name is required'),
  studentDateOfBirth: z.string().optional(),
  interestedClass: z.string().min(1, 'Interested class is required'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  currentSchool: z.string().optional(),
  currentClass: z.string().optional(),
  parentName: z.string().min(1, "Parent's name is required"),
  parentPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number'),
  alternatePhone: z.string().optional(),
  parentEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  source: z.enum(['walk_in', 'website', 'referral', 'social_media', 'phone', 'email', 'other']),
  referredBy: z.string().optional(),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function EnquiryFormScreen() {
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const existing = useEnquiry(id ?? '');
  const createEnquiry = useCreateEnquiry();
  const updateEnquiry = useUpdateEnquiry(id ?? '');
  const [serverError, setServerError] = useState<string | null>(null);

  const enquiry = existing.data;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: enquiry
      ? {
          studentName: enquiry.studentName,
          studentDateOfBirth: enquiry.studentDateOfBirth ?? '',
          interestedClass: enquiry.interestedClass,
          gender: enquiry.gender,
          currentSchool: enquiry.currentSchool ?? '',
          currentClass: enquiry.currentClass ?? '',
          parentName: enquiry.parentName,
          parentPhone: enquiry.parentPhone,
          alternatePhone: enquiry.alternatePhone ?? '',
          parentEmail: enquiry.parentEmail ?? '',
          source: enquiry.source,
          referredBy: enquiry.referredBy ?? '',
          remarks: enquiry.remarks ?? '',
        }
      : undefined,
    defaultValues: {
      studentName: '',
      studentDateOfBirth: '',
      interestedClass: '',
      gender: undefined,
      currentSchool: '',
      currentClass: '',
      parentName: '',
      parentPhone: '',
      alternatePhone: '',
      parentEmail: '',
      source: 'walk_in',
      referredBy: '',
      remarks: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const payload = {
      studentName: values.studentName,
      studentDateOfBirth: values.studentDateOfBirth || undefined,
      interestedClass: values.interestedClass,
      gender: values.gender,
      currentSchool: values.currentSchool || undefined,
      currentClass: values.currentClass || undefined,
      parentName: values.parentName,
      parentPhone: values.parentPhone,
      alternatePhone: values.alternatePhone || undefined,
      parentEmail: values.parentEmail || undefined,
      source: values.source,
      referredBy: values.referredBy || undefined,
      remarks: values.remarks || undefined,
    };

    try {
      if (isEdit && id) {
        await updateEnquiry.mutateAsync(payload);
        router.back();
      } else {
        const created = await createEnquiry.mutateAsync(payload);
        router.replace({ pathname: '/(app)/admissions/[id]', params: { id: created._id } });
      }
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  if (isEdit && existing.isLoading) {
    return (
      <ScreenContainer>
        <Skeleton style={{ height: 300, borderRadius: 16 }} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>
        {isEdit ? 'Edit enquiry' : 'New enquiry'}
      </Text>

      <SectionLabel title="Student" />
      <Controller
        control={control}
        name="studentName"
        render={({ field }) => (
          <TextField label="Student name" value={field.value} onChangeText={field.onChange} error={errors.studentName?.message} />
        )}
      />
      <Controller
        control={control}
        name="interestedClass"
        render={({ field }) => (
          <TextField
            label="Interested class"
            placeholder="e.g. 8"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.interestedClass?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="gender"
        render={({ field }) => (
          <SegmentedControl label="Gender" options={GENDER_OPTIONS} value={field.value ?? 'male'} onChange={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="studentDateOfBirth"
        render={({ field }) => (
          <TextField label="Date of birth" placeholder="YYYY-MM-DD" value={field.value} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="currentSchool"
        render={({ field }) => <TextField label="Current school" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="currentClass"
        render={({ field }) => <TextField label="Current class" value={field.value} onChangeText={field.onChange} />}
      />

      <SectionLabel title="Parent / guardian" />
      <Controller
        control={control}
        name="parentName"
        render={({ field }) => (
          <TextField label="Parent name" value={field.value} onChangeText={field.onChange} error={errors.parentName?.message} />
        )}
      />
      <Controller
        control={control}
        name="parentPhone"
        render={({ field }) => (
          <TextField
            label="Phone"
            keyboardType="phone-pad"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.parentPhone?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="alternatePhone"
        render={({ field }) => (
          <TextField label="Alternate phone" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="parentEmail"
        render={({ field }) => (
          <TextField
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.parentEmail?.message}
          />
        )}
      />

      <SectionLabel title="Source" />
      <Controller
        control={control}
        name="source"
        render={({ field }) => (
          <SegmentedControl label="Source" options={SOURCE_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="referredBy"
        render={({ field }) => <TextField label="Referred by (optional)" value={field.value} onChangeText={field.onChange} />}
      />

      <SectionLabel title="Remarks" />
      <Controller
        control={control}
        name="remarks"
        render={({ field }) => <TextField label="Remarks" value={field.value} onChangeText={field.onChange} multiline />}
      />

      {serverError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{serverError}</Text>
      ) : null}

      <Button label={isEdit ? 'Save changes' : 'Create enquiry'} onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </ScreenContainer>
  );
}

function SectionLabel({ title }: { title: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text style={[typography.label, { color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm }]}>
      {title.toUpperCase()}
    </Text>
  );
}
