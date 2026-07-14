import { StyleSheet, Text, View } from 'react-native';
import type { Attendance, AttendanceStatus } from '@schoolos/types';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { useTheme } from '@/theme';

const STATUS_TONE: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  half_day: 'warning',
  leave_approved: 'neutral',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half day',
  leave_approved: 'On leave',
};

// Shows the raw studentId — the Students module (name/photo lookup) is out of
// scope for this phase, so there's no local student directory to join against.
export function AttendanceRow({ record }: { record: Attendance }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={styles.info}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>{record.studentId}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{record.date}</Text>
      </View>
      <StatusPill label={STATUS_LABEL[record.status]} tone={STATUS_TONE[record.status]} />
    </Card>
  );
}

const styles = StyleSheet.create({
  info: { flexShrink: 1 },
});
