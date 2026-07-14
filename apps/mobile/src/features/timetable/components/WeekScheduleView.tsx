import { StyleSheet, Text, View } from 'react-native';
import type { TeacherWeekEntry } from '@schoolos/types';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme';

const DAY_LABEL: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

interface WeekScheduleViewProps {
  weekSchedule: { dayOfWeek: number; entries: TeacherWeekEntry[] }[];
}

export function WeekScheduleView({ weekSchedule }: WeekScheduleViewProps) {
  const { colors, spacing, typography } = useTheme();
  const hasAnyEntries = weekSchedule.some((day) => day.entries.length > 0);

  if (!hasAnyEntries) {
    return <EmptyState title="No timetable entries" description="Nothing scheduled for this teacher yet." />;
  }

  return (
    <View>
      {weekSchedule
        .filter((day) => day.entries.length > 0)
        .map((day) => (
          <View key={day.dayOfWeek} style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.subheading, { color: colors.text, marginBottom: spacing.sm }]}>
              {DAY_LABEL[day.dayOfWeek] ?? `Day ${day.dayOfWeek}`}
            </Text>
            {day.entries.map((entry, index) => (
              <Card key={`${entry.timetableId}-${entry.slotId}-${index}`} style={{ marginBottom: spacing.sm }}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>{entry.subjectName}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                      {entry.class}-{entry.section}
                      {entry.roomNumber ? ` · Room ${entry.roomNumber}` : ''}
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {entry.startTime}–{entry.endTime}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flexShrink: 1 },
});
