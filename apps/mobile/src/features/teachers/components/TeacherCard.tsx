import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Teacher } from '@schoolos/types';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';
import { EMPLOYMENT_STATUS_LABEL, EMPLOYMENT_STATUS_TONE } from './statusTone';

export function TeacherCard({ teacher, onPress }: { teacher: Teacher; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();
  const extraSubjects = teacher.subjects.length - 2;

  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', gap: 12 }}>
        <Avatar name={teacher.fullName} photoUrl={teacher.photoUrl} />
        <View style={styles.info}>
          <View style={styles.headerRow}>
            <Text style={[typography.bodyStrong, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
              {teacher.fullName}
            </Text>
            <StatusPill
              label={EMPLOYMENT_STATUS_LABEL[teacher.employmentStatus]}
              tone={EMPLOYMENT_STATUS_TONE[teacher.employmentStatus]}
            />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
            {teacher.employeeId}
            {teacher.department ? ` · ${teacher.department}` : ''}
          </Text>
          {teacher.subjects.length > 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
              {teacher.subjects.slice(0, 2).join(', ')}
              {extraSubjects > 0 ? ` +${extraSubjects}` : ''}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  info: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
