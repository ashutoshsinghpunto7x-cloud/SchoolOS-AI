import { useEffect, useMemo, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { EmploymentStatus, Teacher } from '@schoolos/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { canManageTeachers } from '@/constants/roles';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { TeacherCard } from '../components/TeacherCard';
import { useInfiniteTeachers } from '../hooks';

type StatusFilter = EmploymentStatus | 'all';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'On leave', value: 'on_leave' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Inactive', value: 'inactive' },
];

// Debounces the search box so every keystroke doesn't fire a network request
// against a roster that can hold 1,000+ teachers.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function TeacherDirectoryScreen() {
  const { colors, spacing, typography } = useTheme();
  const role = useAuthStore((s) => s.user?.role);
  const canAdd = role ? canManageTeachers(role) : false;
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedDepartment = useDebouncedValue(department, 350);

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      department: debouncedDepartment.trim() || undefined,
      status: status === 'all' ? undefined : status,
    }),
    [debouncedSearch, debouncedDepartment, status]
  );

  const query = useInfiniteTeachers(filters);
  const teachers: Teacher[] = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.meta.total;

  return (
    <ScreenContainer scroll={false} style={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <View style={{ paddingTop: spacing.lg, paddingHorizontal: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={[typography.title, { color: colors.text }]}>Teachers</Text>
          <View style={styles.headerActions}>
            <Text
              style={[typography.bodyStrong, { color: colors.primary }]}
              onPress={() => router.push('/(app)/(tabs)/teachers/search')}
            >
              Search
            </Text>
            {canAdd ? (
              <Text
                style={[typography.bodyStrong, { color: colors.primary }]}
                onPress={() => router.push('/(app)/(tabs)/teachers/new')}
              >
                Add
              </Text>
            ) : null}
          </View>
        </View>

        <TextField label="Department" placeholder="e.g. Science" value={department} onChangeText={setDepartment} />
        <TextField label="Name, ID, or phone" placeholder="Search teachers" value={search} onChangeText={setSearch} />
        <SegmentedControl label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />

        {typeof total === 'number' ? (
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            {total} teacher{total === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>

      <View style={styles.listArea}>
        {query.isLoading ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} style={{ height: 76, borderRadius: 16, marginBottom: 8 }} />
            ))}
          </View>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : teachers.length === 0 ? (
          <EmptyState title="No teachers found" description="Try adjusting your search or filters." />
        ) : (
          <FlashList
            data={teachers}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
            renderItem={({ item }) => (
              <TeacherCard
              teacher={item}
              onPress={() => router.push({ pathname: '/(app)/(tabs)/teachers/[id]', params: { id: item._id } })}
            />
            )}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
            }}
            onRefresh={() => query.refetch()}
            refreshing={query.isRefetching}
            ListFooterComponent={
              query.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerActions: { flexDirection: 'row', gap: 16 },
  listArea: { flex: 1 },
});
