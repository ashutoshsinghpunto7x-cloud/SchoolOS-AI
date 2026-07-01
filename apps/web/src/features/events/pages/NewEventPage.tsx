import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useCreateEvent } from '../hooks/useEvents';
import { EventForm } from '../components/EventForm';
import type { CreateEventPayload } from '@schoolos/types';

export const NewEventPage = () => {
  const navigate = useNavigate();
  const { mutateAsync: createEvent, isPending } = useCreateEvent();

  async function handleSubmit(payload: CreateEventPayload) {
    const event = await createEvent(payload);
    navigate(`/calendar/${event._id}`);
  }

  return (
    <PageContainer>
      <button
        onClick={() => navigate('/calendar')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        School Calendar
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
        <p className="text-sm text-gray-500 mt-1">Add a new event to the school calendar</p>
      </div>

      <EventForm
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel="Create Event"
      />
    </PageContainer>
  );
};
