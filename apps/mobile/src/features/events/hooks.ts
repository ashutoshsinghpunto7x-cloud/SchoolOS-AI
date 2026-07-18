import { useQuery } from '@tanstack/react-query';
import type { UpcomingEventsOptions } from '@schoolos/types';
import { eventsApi } from './api';

export function useUpcomingEvents(options: UpcomingEventsOptions = {}) {
  return useQuery({
    queryKey: ['events', 'upcoming', options],
    queryFn: () => eventsApi.getUpcoming(options),
  });
}
