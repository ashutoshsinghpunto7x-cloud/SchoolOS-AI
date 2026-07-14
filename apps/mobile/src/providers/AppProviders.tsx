import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/theme';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            {/* @tanstack/react-query is hoisted to the workspace root and type-checks
                against the root's @types/react (18.x, pinned for apps/web), while this
                app runs React 19 types locally — the two ReactNode types are structurally
                identical at runtime but nominally distinct to TS, down to ReactPortal's
                shape. Cast at this one boundary rather than forcing a repo-wide types
                resolution override that would risk breaking JSX resolution elsewhere. */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <QueryClientProvider client={queryClient}>{children as any}</QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
