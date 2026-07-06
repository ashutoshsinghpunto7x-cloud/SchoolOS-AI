import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, List, LayoutGrid, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { EventFilters, EventFiltersState } from '../components/EventFilters';
import { CalendarGrid } from '../components/CalendarGrid';
import { WeekView } from '../components/WeekView';
import { AgendaView } from '../components/AgendaView';
import type { EventListOptions } from '@schoolos/types';

type CalendarView = 'month' | 'week' | 'agenda';

const VIEW_TABS: { id: CalendarView; label: string; Icon: React.ElementType }[] = [
  { id: 'month',  label: 'Month',  Icon: LayoutGrid },
  { id: 'week',   label: 'Week',   Icon: Calendar },
  { id: 'agenda', label: 'Agenda', Icon: List },
];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // go to Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

export const CalendarWorkspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Creating events is admin-only for now — add 'principal' here once that role/dashboard exists.
  const canCreate = user?.role === 'admin';
  const today    = new Date();

  const [view, setView]               = useState<CalendarView>('month');
  const [year, setYear]               = useState(today.getFullYear());
  const [month, setMonth]             = useState(today.getMonth() + 1);
  const [weekStart, setWeekStart]     = useState(() => getWeekStart(today));
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  const [filters, setFilters] = useState<EventFiltersState>({
    search: '', eventType: '', status: '', audience: '',
  });

  // Build query options based on active view
  const queryOpts = useMemo((): EventListOptions => {
    const base: EventListOptions = {
      limit:     200, // load enough for the calendar view
      sortBy:    'startDate',
      sortOrder: 'asc',
    };
    if (filters.search)    base.search    = filters.search;
    if (filters.eventType) base.eventType = filters.eventType as EventListOptions['eventType'];
    if (filters.status)    base.status    = filters.status as EventListOptions['status'];
    if (filters.audience)  base.audience  = filters.audience as EventListOptions['audience'];

    if (view === 'month') {
      base.year  = year;
      base.month = month;
    } else if (view === 'week') {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      base.startFrom = weekStart.toISOString().split('T')[0];
      base.startTo   = weekEnd.toISOString().split('T')[0];
    }
    return base;
  }, [view, year, month, weekStart, filters]);

  const { data, isLoading, isError } = useEvents(queryOpts);
  const events = data?.data ?? [];

  function handleWeekChange(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(getWeekStart(d));
  }

  // Events for the selected day (month view sidebar)
  const dayEvents = selectedDate
    ? events.filter((e) => {
        const start = e.startDate.split('T')[0];
        const end   = e.endDate.split('T')[0];
        return start <= selectedDate && selectedDate <= end;
      })
    : [];

  return (
    <PageContainer>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage events, holidays, and school activities</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/calendar/new')}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700
                       text-sm font-bold text-white transition-colors flex-shrink-0"
            type="button"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        )}
      </div>

      {/* View switcher + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {VIEW_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors',
                view === id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <EventFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-gray-600">Failed to load events. Please try again.</p>
        </div>
      )}

      {/* Views */}
      {!isLoading && !isError && (
        <>
          {view === 'month' && (
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="flex-1 min-w-0">
                <CalendarGrid
                  year={year}
                  month={month}
                  events={events}
                  onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelectedDate(undefined); }}
                  onDaySelect={setSelectedDate}
                  selectedDate={selectedDate}
                />
              </div>

              {/* Day detail panel */}
              <div className="lg:w-72 flex-shrink-0">
                {selectedDate ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })}
                    </h3>
                    {dayEvents.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No events</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {dayEvents.map((e) => (
                          <button
                            key={e._id}
                            type="button"
                            onClick={() => navigate(`/calendar/${e._id}`)}
                            className="text-left w-full p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors"
                          >
                            <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                            {e.location && (
                              <p className="text-xs text-gray-500 mt-0.5">{e.location}</p>
                            )}
                            {!e.isAllDay && e.startTime && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-center h-24">
                    <p className="text-sm text-gray-400">Select a date to view events</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'week' && (
            <WeekView
              weekStart={weekStart}
              events={events}
              onWeekChange={handleWeekChange}
              onEventClick={(id) => navigate(`/calendar/${id}`)}
            />
          )}

          {view === 'agenda' && (
            <AgendaView events={events} />
          )}
        </>
      )}
    </PageContainer>
  );
};
