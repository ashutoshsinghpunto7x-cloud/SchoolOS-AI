import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TeacherNoteType } from '@schoolos/types';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { canManageTeacherPhoto, canManageTeachers } from '@/constants/roles';
import { useTeacherWeekSchedule } from '@/features/timetable/hooks';
import { WeekScheduleView } from '@/features/timetable/components/WeekScheduleView';
import { extractErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { InfoRow, InfoSection } from '../components/InfoSection';
import { NoteItem } from '../components/NoteItem';
import { EMPLOYMENT_STATUS_LABEL, EMPLOYMENT_STATUS_TONE } from '../components/statusTone';
import {
  useCreateTeacherNote,
  useDeleteTeacherNote,
  useRemoveTeacherPhoto,
  useTeacher,
  useTeacherNotes,
  useUploadTeacherPhoto,
} from '../hooks';

type ProfileTab = 'overview' | 'notes' | 'timetable';

const TAB_OPTIONS: { label: string; value: ProfileTab }[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Notes', value: 'notes' },
  { label: 'Timetable', value: 'timetable' },
];

const NOTE_TYPE_OPTIONS: { label: string; value: TeacherNoteType }[] = [
  { label: 'General', value: 'general' },
  { label: 'Pinned', value: 'pinned' },
  { label: 'Private', value: 'private' },
];

export function TeacherProfileScreen() {
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState<ProfileTab>('overview');

  const teacherQuery = useTeacher(id ?? '');
  const uploadPhoto = useUploadTeacherPhoto(id ?? '');
  const removePhoto = useRemoveTeacherPhoto(id ?? '');
  const [photoError, setPhotoError] = useState<string | null>(null);

  const canEdit = role ? canManageTeachers(role) : false;
  const canEditPhoto = role ? canManageTeacherPhoto(role) : false;
  // The timetable endpoint used here has no per-role restriction server-side,
  // but showing it only where it's actually useful keeps the profile focused.
  const canViewTimetable = role ? canManageTeachers(role) || role === 'accountant' : false;

  const onPickPhoto = async () => {
    setPhotoError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError('Photo library access was denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      await uploadPhoto.mutateAsync({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
    } catch (err) {
      setPhotoError(extractErrorMessage(err));
    }
  };

  if (teacherQuery.isLoading) {
    return (
      <ScreenContainer>
        <Skeleton style={{ height: 120, borderRadius: 16, marginBottom: 16 }} />
        <Skeleton style={{ height: 200, borderRadius: 16 }} />
      </ScreenContainer>
    );
  }

  if (teacherQuery.isError || !teacherQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState error={teacherQuery.error} onRetry={() => teacherQuery.refetch()} />
      </ScreenContainer>
    );
  }

  const teacher = teacherQuery.data;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={canEditPhoto ? onPickPhoto : undefined} disabled={!canEditPhoto || uploadPhoto.isPending}>
          <Avatar name={teacher.fullName} photoUrl={teacher.photoUrl} size={72} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[typography.heading, { color: colors.text }]}>{teacher.fullName}</Text>
          <View style={{ marginTop: spacing.xs }}>
            <StatusPill
              label={EMPLOYMENT_STATUS_LABEL[teacher.employmentStatus]}
              tone={EMPLOYMENT_STATUS_TONE[teacher.employmentStatus]}
            />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
            {teacher.employeeId}
            {teacher.department ? ` · ${teacher.department}` : ''}
          </Text>
        </View>
      </View>

      {canEditPhoto && teacher.photoUrl ? (
        <Pressable onPress={() => removePhoto.mutate()} style={{ marginBottom: spacing.md }}>
          <Text style={[typography.caption, { color: colors.danger }]}>
            {removePhoto.isPending ? 'Removing photo…' : 'Remove photo'}
          </Text>
        </Pressable>
      ) : null}
      {photoError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>{photoError}</Text>
      ) : null}

      {canEdit ? (
        <View style={{ marginBottom: spacing.lg }}>
          <Button
            label="Edit teacher"
            variant="secondary"
            onPress={() => router.push({ pathname: '/(app)/(tabs)/teachers/[id]/edit', params: { id: teacher._id } })}
          />
        </View>
      ) : null}

      <SegmentedControl label="View" options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === 'overview' ? <OverviewTab teacher={teacher} /> : null}
      {tab === 'notes' ? <NotesTab teacherId={teacher._id} /> : null}
      {tab === 'timetable' ? (
        canViewTimetable ? (
          <TimetableTab teacherId={teacher._id} />
        ) : (
          <EmptyState title="Not available" description="Timetable isn't shown for this role." />
        )
      ) : null}
    </ScreenContainer>
  );
}

function OverviewTab({ teacher }: { teacher: NonNullable<ReturnType<typeof useTeacher>['data']> }) {
  return (
    <View>
      <InfoSection title="Contact">
        <InfoRow label="Phone" value={teacher.phone} />
        {teacher.alternatePhone ? <InfoRow label="Alternate phone" value={teacher.alternatePhone} /> : null}
        {teacher.email ? <InfoRow label="Email" value={teacher.email} /> : null}
        {teacher.address ? <InfoRow label="Address" value={teacher.address} /> : null}
      </InfoSection>

      <InfoSection title="Professional">
        {teacher.department ? <InfoRow label="Department" value={teacher.department} /> : null}
        {teacher.subjects.length > 0 ? <InfoRow label="Subjects" value={teacher.subjects.join(', ')} /> : null}
        {teacher.assignedClasses.length > 0 ? (
          <InfoRow label="Assigned classes" value={teacher.assignedClasses.join(', ')} />
        ) : null}
        {typeof teacher.experienceYears === 'number' ? (
          <InfoRow label="Experience" value={`${teacher.experienceYears} yrs`} />
        ) : null}
        {teacher.joiningDate ? <InfoRow label="Joined" value={new Date(teacher.joiningDate).toLocaleDateString()} /> : null}
      </InfoSection>

      {teacher.qualification ? (
        <InfoSection title="Qualification">
          <InfoRow label="Degree" value={teacher.qualification.degree} />
          <InfoRow label="Institution" value={teacher.qualification.institution} />
          {teacher.qualification.yearOfPassing ? (
            <InfoRow label="Year" value={String(teacher.qualification.yearOfPassing)} />
          ) : null}
        </InfoSection>
      ) : null}

      {teacher.emergencyContact ? (
        <InfoSection title="Emergency contact">
          <InfoRow label="Name" value={teacher.emergencyContact.name} />
          <InfoRow label="Phone" value={teacher.emergencyContact.phone} />
          <InfoRow label="Relation" value={teacher.emergencyContact.relation} />
        </InfoSection>
      ) : null}

      {teacher.remarks ? (
        <InfoSection title="Remarks">
          <InfoRow label="" value={teacher.remarks} />
        </InfoSection>
      ) : null}

      {teacher.customFields && Object.keys(teacher.customFields).length > 0 ? (
        <InfoSection title="Additional details">
          {Object.entries(teacher.customFields).map(([key, value]) => (
            <InfoRow key={key} label={key} value={String(value)} />
          ))}
        </InfoSection>
      ) : null}
    </View>
  );
}

function NotesTab({ teacherId }: { teacherId: string }) {
  const { spacing } = useTheme();
  const notes = useTeacherNotes(teacherId);
  const createNote = useCreateTeacherNote(teacherId);
  const deleteNote = useDeleteTeacherNote(teacherId);

  const [content, setContent] = useState('');
  const [type, setType] = useState<TeacherNoteType>('general');

  const onAdd = async () => {
    if (!content.trim()) return;
    await createNote.mutateAsync({ content: content.trim(), type });
    setContent('');
    setType('general');
  };

  return (
    <View>
      <View style={{ marginBottom: spacing.lg }}>
        <TextField
          label="Add a note"
          value={content}
          onChangeText={setContent}
          multiline
          style={{ height: 88, paddingTop: 12, textAlignVertical: 'top' }}
        />
        <SegmentedControl label="Type" options={NOTE_TYPE_OPTIONS} value={type} onChange={setType} />
        <Button label="Add note" onPress={onAdd} loading={createNote.isPending} disabled={!content.trim()} />
      </View>

      {notes.isLoading ? (
        <Skeleton style={{ height: 100, borderRadius: 16 }} />
      ) : notes.isError ? (
        <ErrorState error={notes.error} onRetry={() => notes.refetch()} />
      ) : !notes.data || notes.data.length === 0 ? (
        <EmptyState title="No notes yet" />
      ) : (
        notes.data.map((note) => (
          <NoteItem key={note._id} note={note} onDelete={() => deleteNote.mutate(note._id)} />
        ))
      )}
    </View>
  );
}

function TimetableTab({ teacherId }: { teacherId: string }) {
  const query = useTeacherWeekSchedule(teacherId);

  if (query.isLoading) return <Skeleton style={{ height: 200, borderRadius: 16 }} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return <WeekScheduleView weekSchedule={query.data ?? []} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  headerInfo: { flex: 1 },
});
