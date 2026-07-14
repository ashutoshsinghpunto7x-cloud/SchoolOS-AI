import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { TeacherCard } from '../components/TeacherCard';
import { useTeacherSearch } from '../hooks';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function TeacherSearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const search = useTeacherSearch(debouncedQuery);

  return (
    <ScreenContainer scroll={false}>
      <TextField
        label="Search teachers"
        placeholder="Name, employee ID, or phone"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      {!debouncedQuery.trim() ? (
        <EmptyState title="Search for a teacher" description="Start typing a name, employee ID, or phone number." />
      ) : search.isLoading ? (
        <View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 76, borderRadius: 16, marginBottom: 8 }} />
          ))}
        </View>
      ) : search.isError ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : !search.data || search.data.length === 0 ? (
        <EmptyState title="No matches" description={`Nothing found for "${debouncedQuery}".`} />
      ) : (
        search.data.map((teacher) => (
          <TeacherCard
            key={teacher._id}
            teacher={teacher}
            onPress={() => router.push({ pathname: '/(app)/(tabs)/teachers/[id]', params: { id: teacher._id } })}
          />
        ))
      )}
    </ScreenContainer>
  );
}
