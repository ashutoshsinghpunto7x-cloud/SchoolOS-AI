import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import type { EnquiryNote } from '@schoolos/types';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { canManageAdmissions } from '@/constants/roles';
import { InfoRow, InfoSection } from '@/features/teachers/components/InfoSection';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { EnquiryNoteItem } from '../components/EnquiryNoteItem';
import { STAGE_LABEL, STAGE_ORDER, STAGE_TONE } from '../components/stageTone';
import {
  useCreateEnquiryNote,
  useDeleteEnquiryNote,
  useEnquiry,
  useEnquiryNotes,
  useUpdateEnquiryStage,
} from '../hooks';

type ProfileTab = 'overview' | 'notes';

const TAB_OPTIONS: { label: string; value: ProfileTab }[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'Notes', value: 'notes' },
];

const STAGE_OPTIONS = STAGE_ORDER.map((value) => ({ label: STAGE_LABEL[value], value }));

const NOTE_TYPE_OPTIONS: { label: string; value: EnquiryNote['type'] }[] = [
  { label: 'General', value: 'general' },
  { label: 'Pinned', value: 'pinned' },
  { label: 'Private', value: 'private' },
];

export function EnquiryProfileScreen() {
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState<ProfileTab>('overview');

  const enquiryQuery = useEnquiry(id ?? '');
  const updateStage = useUpdateEnquiryStage(id ?? '');
  const [stageError, setStageError] = useState<string | null>(null);

  const canEdit = role ? canManageAdmissions(role) : false;

  if (enquiryQuery.isLoading) {
    return (
      <ScreenContainer>
        <Skeleton style={{ height: 120, borderRadius: 16, marginBottom: 16 }} />
        <Skeleton style={{ height: 200, borderRadius: 16 }} />
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

  const enquiry = enquiryQuery.data;
  const isTerminal = enquiry.stage === 'converted' || enquiry.stage === 'lost';

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <Avatar name={enquiry.studentName} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.heading, { color: colors.text }]}>{enquiry.studentName}</Text>
          <View style={{ marginTop: spacing.xs }}>
            <StatusPill label={STAGE_LABEL[enquiry.stage]} tone={STAGE_TONE[enquiry.stage]} />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Class {enquiry.interestedClass} · {enquiry.parentName}
          </Text>
        </View>
      </View>

      {canEdit ? (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Edit"
              variant="secondary"
              onPress={() => router.push({ pathname: '/(app)/admissions/[id]/edit', params: { id: enquiry._id } })}
            />
          </View>
          {enquiry.stage !== 'converted' ? (
            <View style={{ flex: 1 }}>
              <Button
                label="Convert to student"
                onPress={() => router.push({ pathname: '/(app)/admissions/[id]/convert', params: { id: enquiry._id } })}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {canEdit && !isTerminal ? (
        <View style={{ marginBottom: spacing.lg }}>
          <SegmentedControl
            label="Stage"
            options={STAGE_OPTIONS}
            value={enquiry.stage}
            onChange={(stage) => {
              setStageError(null);
              updateStage.mutate({ stage });
            }}
          />
          {stageError ? <Text style={[typography.caption, { color: colors.danger }]}>{stageError}</Text> : null}
        </View>
      ) : null}

      <SegmentedControl label="View" options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === 'overview' ? <OverviewTab enquiry={enquiry} /> : null}
      {tab === 'notes' ? <NotesTab enquiryId={enquiry._id} /> : null}
    </ScreenContainer>
  );
}

function OverviewTab({ enquiry }: { enquiry: NonNullable<ReturnType<typeof useEnquiry>['data']> }) {
  return (
    <View>
      <InfoSection title="Parent / guardian">
        <InfoRow label="Name" value={enquiry.parentName} />
        <InfoRow label="Phone" value={enquiry.parentPhone} />
        {enquiry.alternatePhone ? <InfoRow label="Alternate phone" value={enquiry.alternatePhone} /> : null}
        {enquiry.parentEmail ? <InfoRow label="Email" value={enquiry.parentEmail} /> : null}
      </InfoSection>

      <InfoSection title="Student">
        <InfoRow label="Interested class" value={enquiry.interestedClass} />
        {enquiry.studentDateOfBirth ? (
          <InfoRow label="Date of birth" value={new Date(enquiry.studentDateOfBirth).toLocaleDateString()} />
        ) : null}
        {enquiry.currentSchool ? <InfoRow label="Current school" value={enquiry.currentSchool} /> : null}
        {enquiry.currentClass ? <InfoRow label="Current class" value={enquiry.currentClass} /> : null}
      </InfoSection>

      <InfoSection title="Enquiry">
        <InfoRow label="Source" value={enquiry.source.replace('_', ' ')} />
        {enquiry.referredBy ? <InfoRow label="Referred by" value={enquiry.referredBy} /> : null}
        {enquiry.assignedCounsellor ? <InfoRow label="Assigned to" value={enquiry.assignedCounsellor} /> : null}
        {enquiry.followUpDate ? (
          <InfoRow label="Follow-up date" value={new Date(enquiry.followUpDate).toLocaleDateString()} />
        ) : null}
      </InfoSection>

      {enquiry.remarks ? (
        <InfoSection title="Remarks">
          <InfoRow label="" value={enquiry.remarks} />
        </InfoSection>
      ) : null}
    </View>
  );
}

function NotesTab({ enquiryId }: { enquiryId: string }) {
  const { spacing } = useTheme();
  const notes = useEnquiryNotes(enquiryId);
  const createNote = useCreateEnquiryNote(enquiryId);
  const deleteNote = useDeleteEnquiryNote(enquiryId);

  const [content, setContent] = useState('');
  const [type, setType] = useState<EnquiryNote['type']>('general');

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
          <EnquiryNoteItem key={note._id} note={note} onDelete={() => deleteNote.mutate(note._id)} />
        ))
      )}
    </View>
  );
}
