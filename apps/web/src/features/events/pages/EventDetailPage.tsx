import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, MapPin, Clock, Users, Tag,
  StickyNote, Loader2, AlertCircle, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/workspace/PageContainer';
import {
  useEvent, useUpdateEventStatus, useDeleteEvent,
  useMarkEventRead, useEventReadReceipts,
} from '../hooks/useEvents';
import { EventStatusBadge } from '../components/EventStatusBadge';
import { EventTypeBadge, EVENT_TYPE_COLOR } from '../components/EventTypeBadge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { EventStatus } from '@schoolos/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const AUDIENCE_LABEL: Record<string, string> = {
  all: 'Everyone', students: 'Students', teachers: 'Teachers',
  parents: 'Parents', staff: 'Staff',
};

const STATUS_TRANSITIONS: Record<EventStatus, { label: string; next: EventStatus }[]> = {
  draft:     [{ label: 'Mark as Scheduled', next: 'scheduled' }, { label: 'Cancel Event', next: 'cancelled' }],
  scheduled: [{ label: 'Publish Event',     next: 'published' }, { label: 'Cancel Event', next: 'cancelled' }],
  published: [{ label: 'Mark as Completed', next: 'completed' }, { label: 'Cancel Event', next: 'cancelled' }],
  completed: [],
  cancelled: [],
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const EventDetailPage = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin' || user?.role === 'principal';

  const { data: event, isLoading, isError } = useEvent(id!);
  const { mutateAsync: updateStatus, isPending: changingStatus } = useUpdateEventStatus(id!);
  const { mutateAsync: deleteEvent, isPending: deleting }        = useDeleteEvent();
  const { mutate: markRead } = useMarkEventRead();
  const { data: receipts, isLoading: receiptsLoading } = useEventReadReceipts(id!, isAdmin);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotReadList, setShowNotReadList] = useState(false);
  const hasMarkedRead = useRef(false);

  useEffect(() => {
    if (event && !hasMarkedRead.current) {
      hasMarkedRead.current = true;
      markRead(event._id);
    }
  }, [event, markRead]);

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
          <button onClick={() => navigate('/calendar')}
            className="h-10 px-5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Back to Calendar
          </button>
        </div>
      </PageContainer>
    );
  }

  const transitions = STATUS_TRANSITIONS[event.status] ?? [];
  const isMultiDay  =
    new Date(event.startDate).toDateString() !== new Date(event.endDate).toDateString();

  async function handleStatusChange(next: EventStatus) {
    setShowStatusMenu(false);
    await updateStatus({ status: next });
  }

  async function handleDelete() {
    await deleteEvent(id!);
    navigate('/calendar');
  }

  return (
    <PageContainer>
      {/* Back */}
      <button onClick={() => navigate('/calendar')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button">
        <ArrowLeft className="w-4 h-4" />
        School Calendar
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0', EVENT_TYPE_COLOR[event.eventType])}>
            <Clock className="w-7 h-7 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <div className="flex gap-2 mt-0.5">
                <EventTypeBadge type={event.eventType} />
                <EventStatusBadge status={event.status} />
              </div>
            </div>

            {event.description && (
              <p className="text-sm text-gray-500 mt-2">{event.description}</p>
            )}

            {/* Key details */}
            <div className="flex flex-col gap-1.5 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                {isMultiDay
                  ? `${fmtDate(event.startDate)} – ${fmtDate(event.endDate)}`
                  : fmtDate(event.startDate)}
                {!event.isAllDay && event.startTime && (
                  <span className="text-gray-400">
                    · {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}
                  </span>
                )}
              </div>

              {event.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {event.location}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-gray-400" />
                {event.audience.map((a) => AUDIENCE_LABEL[a] ?? a).join(', ')}
              </div>

              {event.organizer && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  Organized by {event.organizer}
                </div>
              )}
            </div>

            {/* Tags */}
            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Tag className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                {event.tags.map((tag) => (
                  <span key={tag}
                    className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {isAdmin && (
          <button
            onClick={() => navigate(`/calendar/${id}/edit`)}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-white border border-gray-200
                       hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors"
            type="button"
          >
            <Pencil className="w-4 h-4" />
            Edit Event
          </button>
        )}

        {transitions.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusMenu((v) => !v)}
              disabled={changingStatus}
              className="flex items-center gap-2 h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700
                         text-sm font-bold text-white transition-colors disabled:opacity-50"
            >
              {changingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
              Change Status
            </button>
            {showStatusMenu && (
              <div className="absolute left-0 top-12 z-20 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 overflow-hidden">
                {transitions.map(({ label, next }) => (
                  <button
                    key={next}
                    type="button"
                    onClick={() => void handleStatusChange(next)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors',
                      next === 'cancelled' ? 'text-red-600' : 'text-gray-800',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-white border border-gray-200
                       hover:bg-red-50 hover:border-red-200 hover:text-red-600
                       text-sm font-semibold text-gray-500 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Read receipts (admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-gray-400" />
            Teacher Read Receipts
          </h3>

          {receiptsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading read status…
            </div>
          )}

          {!receiptsLoading && receipts && (
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {receipts.readCount} of {receipts.totalTeachers}
                </span>{' '}
                teachers have read this{receipts.totalTeachers === 0 ? ' (no teachers on record)' : ''}.
              </p>

              {receipts.notReadBy.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowNotReadList((v) => !v)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {showNotReadList ? 'Hide' : 'Show'} teachers who haven't read it
                  </button>
                  {showNotReadList && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {receipts.notReadBy.map((t) => (
                        <li
                          key={t.userId}
                          className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
                        >
                          {t.userDisplayName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-gray-400" />
            Internal Notes
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}

      {/* Meta */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Record Info</h3>
        <dl className="space-y-2">
          {[
            { label: 'Created By', value: event.createdBy },
            { label: 'Updated By', value: event.updatedBy },
            { label: 'Created At', value: new Date(event.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
          ].map(({ label, value }) => value ? (
            <div key={label} className="flex justify-between text-sm">
              <dt className="text-gray-400">{label}</dt>
              <dd className="font-medium text-gray-700">{value}</dd>
            </div>
          ) : null)}
        </dl>
      </div>

      {/* Delete confirm overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Event?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently remove <strong>{event.title}</strong> from the calendar.
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-10 px-5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
