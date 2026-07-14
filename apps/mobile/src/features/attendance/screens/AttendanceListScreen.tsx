import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme';
import { useClassAttendance } from '../hooks';
import { AttendanceRow } from '../components/AttendanceRow';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceListScreen() {
  const { colors, spacing, typography } = useTheme();
  const [klass, setKlass] = useState('');
  const [section, setSection] = useState('');
  const date = todayIso();

  const query = useClassAttendance(klass.trim(), section.trim(), date);
  const hasSelection = !!klass.trim() && !!section.trim();

  return (
    <ScreenContainer onRefresh={hasSelection ? () => query.refetch() : undefined} refreshing={query.isFetching}>
      <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>Attendance</Text>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Class" placeholder="e.g. 8" value={klass} onChangeText={setKlass} autoCapitalize="characters" />
        </View>
        <View style={styles.half}>
          <TextField label="Section" placeholder="e.g. A" value={section} onChangeText={setSection} autoCapitalize="characters" />
        </View>
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <Button
          label="Scan QR to mark attendance"
          onPress={() => router.push({ pathname: '/(app)/(tabs)/attendance/scan', params: { class: klass.trim(), section: section.trim() } })}
          disabled={!hasSelection}
        />
      </View>

      {!hasSelection ? (
        <EmptyState title="Select a class and section" description="Enter a class and section above to view today's attendance." />
      ) : query.isLoading ? (
        <View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 64, borderRadius: 16, marginBottom: 8 }} />
          ))}
        </View>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState title="No attendance marked yet" description={`Nothing recorded for ${date} in this class.`} />
      ) : (
        query.data.map((record) => <AttendanceRow key={record._id} record={record} />)
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
