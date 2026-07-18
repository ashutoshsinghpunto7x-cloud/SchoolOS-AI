import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { EnquiryNote } from '@schoolos/types';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';

const TYPE_LABEL: Record<EnquiryNote['type'], string> = {
  general: 'General',
  pinned: 'Pinned',
  private: 'Private',
};

const TYPE_TONE: Record<EnquiryNote['type'], 'neutral' | 'warning' | 'danger'> = {
  general: 'neutral',
  pinned: 'warning',
  private: 'danger',
};

export function EnquiryNoteItem({ note, onDelete }: { note: EnquiryNote; onDelete?: () => void }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.header}>
        <StatusPill label={TYPE_LABEL[note.type]} tone={TYPE_TONE[note.type]} />
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={[typography.caption, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}>{note.content}</Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
        {note.createdByName} · {new Date(note.createdAt).toLocaleDateString()}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
