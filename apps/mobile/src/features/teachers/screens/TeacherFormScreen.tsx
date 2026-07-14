import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';
import type { EmploymentStatus, Gender } from '@schoolos/types';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';
import { EMPLOYMENT_STATUS_LABEL } from '../components/statusTone';
import { useCreateTeacher, useTeacher, useUpdateTeacher } from '../hooks';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const STATUS_OPTIONS: { label: string; value: EmploymentStatus }[] = (
  Object.keys(EMPLOYMENT_STATUS_LABEL) as EmploymentStatus[]
).map((value) => ({ label: EMPLOYMENT_STATUS_LABEL[value], value }));

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number'),
  alternatePhone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
  department: z.string().optional(),
  experienceYears: z.string().optional(),
  subjects: z.string().optional(),
  assignedClasses: z.string().optional(),
  employmentStatus: z.enum(['applicant', 'active', 'on_leave', 'suspended', 'resigned', 'retired', 'inactive']),
  degree: z.string().optional(),
  institution: z.string().optional(),
  yearOfPassing: z.string().optional(),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const toCsv = (value?: string[]): string => (value ?? []).join(', ');
const fromCsv = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

export function TeacherFormScreen() {
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const existing = useTeacher(id ?? '');
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher(id ?? '');
  const [serverError, setServerError] = useState<string | null>(null);

  const teacher = existing.data;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: teacher
      ? {
          fullName: teacher.fullName,
          gender: teacher.gender,
          phone: teacher.phone,
          alternatePhone: teacher.alternatePhone ?? '',
          email: teacher.email ?? '',
          address: teacher.address ?? '',
          department: teacher.department ?? '',
          experienceYears: teacher.experienceYears != null ? String(teacher.experienceYears) : '',
          subjects: toCsv(teacher.subjects),
          assignedClasses: toCsv(teacher.assignedClasses),
          employmentStatus: teacher.employmentStatus,
          degree: teacher.qualification?.degree ?? '',
          institution: teacher.qualification?.institution ?? '',
          yearOfPassing: teacher.qualification?.yearOfPassing ? String(teacher.qualification.yearOfPassing) : '',
          remarks: teacher.remarks ?? '',
        }
      : undefined,
    defaultValues: {
      fullName: '',
      gender: 'male',
      phone: '',
      alternatePhone: '',
      email: '',
      address: '',
      department: '',
      experienceYears: '',
      subjects: '',
      assignedClasses: '',
      employmentStatus: 'active',
      degree: '',
      institution: '',
      yearOfPassing: '',
      remarks: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const payload = {
      fullName: values.fullName,
      gender: values.gender,
      phone: values.phone,
      alternatePhone: values.alternatePhone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      department: values.department || undefined,
      experienceYears: values.experienceYears ? Number(values.experienceYears) : undefined,
      subjects: fromCsv(values.subjects),
      assignedClasses: fromCsv(values.assignedClasses),
      employmentStatus: values.employmentStatus,
      qualification:
        values.degree || values.institution
          ? {
              degree: values.degree ?? '',
              institution: values.institution ?? '',
              yearOfPassing: values.yearOfPassing ? Number(values.yearOfPassing) : undefined,
            }
          : undefined,
      remarks: values.remarks || undefined,
    };

    try {
      if (isEdit && id) {
        await updateTeacher.mutateAsync(payload);
        router.back();
      } else {
        const created = await createTeacher.mutateAsync(payload);
        router.replace({ pathname: '/(app)/(tabs)/teachers/[id]', params: { id: created._id } });
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
        {isEdit ? 'Edit teacher' : 'New teacher'}
      </Text>

      <SectionLabel title="Personal" />
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField label="Full name" value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />
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
        name="employmentStatus"
        render={({ field }) => (
          <SegmentedControl label="Status" options={STATUS_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />

      <SectionLabel title="Contact" />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <TextField
            label="Phone"
            keyboardType="phone-pad"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.phone?.message}
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
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="address"
        render={({ field }) => <TextField label="Address" value={field.value} onChangeText={field.onChange} multiline />}
      />

      <SectionLabel title="Professional" />
      <Controller
        control={control}
        name="department"
        render={({ field }) => <TextField label="Department" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="experienceYears"
        render={({ field }) => (
          <TextField label="Experience (years)" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="subjects"
        render={({ field }) => (
          <TextField label="Subjects (comma separated)" value={field.value} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="assignedClasses"
        render={({ field }) => (
          <TextField label="Assigned classes (comma separated)" placeholder="e.g. 8A, 9B" value={field.value} onChangeText={field.onChange} />
        )}
      />

      <SectionLabel title="Qualification" />
      <Controller
        control={control}
        name="degree"
        render={({ field }) => <TextField label="Degree" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="institution"
        render={({ field }) => <TextField label="Institution" value={field.value} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="yearOfPassing"
        render={({ field }) => (
          <TextField label="Year of passing" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />
        )}
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

      <Button label={isEdit ? 'Save changes' : 'Create teacher'} onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
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
