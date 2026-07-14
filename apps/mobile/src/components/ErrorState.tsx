import { extractErrorMessage } from '@/services/api/client';
import { EmptyState } from './EmptyState';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description={extractErrorMessage(error)}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}
