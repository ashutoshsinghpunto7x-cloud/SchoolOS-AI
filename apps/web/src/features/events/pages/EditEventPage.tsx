import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useEvent, useUpdateEvent } from '../hooks/useEvents';
import { EventForm } from '../components/EventForm';
import type { CreateEventPayload } from '@schoolos/types';

export const EditEventPage = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading, isError } = useEvent(id!);
  const { mutateAsync: updateEvent, isPending } = useUpdateEvent(id!);

  async function handleSubmit(payload: CreateEventPayload) {
    await updateEvent(payload);
    navigate(`/calendar/${id}`);
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !event) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-600">Event not found.</p>
          <button
            onClick={() => navigate('/calendar')}
            className="h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Back to Calendar
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <button
        onClick={() => navigate(`/calendar/${id}`)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Event
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
        <p className="text-sm text-gray-500 mt-1 truncate">{event.title}</p>
      </div>

      <EventForm
        defaultValues={event}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel="Save Changes"
      />
    </PageContainer>
  );
};
