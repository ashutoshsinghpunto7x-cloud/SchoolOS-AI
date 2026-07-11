import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, CalendarClock, X } from 'lucide-react';
import { useSubstitutes, useUpdateSubstitute, useTimetables, usePeriodSlots } from '../hooks/useTimetable';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SubstituteListOptions, Timetable } from '@schoolos/types';
import { SubstituteForm } from '../components/SubstituteForm';


export const SubstituteWorkspace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Only admin/principal may assign or cancel a substitution — matches the
  // server-side authorize() on POST/PATCH /timetable/substitutes. A daily
  // substitution should only ever begin because the Principal assigned it.
  const canManage = user?.role === 'admin' || user?.role === 'principal';
  const today = new Date().toISOString().slice(0, 10);

  const [filters, setFilters] = useState<SubstituteListOptions>({
    dateFrom: today,
    dateTo:   today,
  });
  const [showForm,  setShowForm]  = useState(false);
  const [selectedTt, setSelectedTt] = useState<Timetable | null>(null);

  const { data, isLoading } = useSubstitutes(filters);
  const { data: ttData }    = useTimetables({ status: 'published', limit: 100 });
  const { data: slots = [] } = usePeriodSlots();

  const substitutes = data?.data ?? [];
  const timetables  = ttData?.data ?? [];

  function handleFilterDate(e: React.ChangeEvent<HTMLInputElement>) {
    setFilters((f) => ({ ...f, dateFrom: e.target.value, dateTo: e.target.value }));
  }

  return (
    <div className="px-6 py-6 max-w-screen-lg mx-auto flex flex-col gap-5">
      <button type="button" onClick={() => navigate('/timetable')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Timetable
      </button>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Substitutes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage temporary teacher replacements</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white transition-colors">
            <Plus className="w-4 h-4" />
            Assign Substitute
          </button>
        )}
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="date"
          value={filters.dateFrom ?? today}
          onChange={handleFilterDate}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#7C3AED]"
        />
        <select
          value={filters.class ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, class: e.target.value || undefined }))}
          className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm cursor-pointer focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="">All Classes</option>
          {timetables.map((tt) => (
            <option key={tt._id} value={tt.class}>Class {tt.class}-{tt.section}</option>
          ))}
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Assign Substitute</h2>
              <button type="button" onClick={() => setShowForm(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Timetable selector */}
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTt?._id ?? ''}
                  onChange={(e) => setSelectedTt(timetables.find((tt) => tt._id === e.target.value) ?? null)}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="">Select published timetable</option>
                  {timetables.map((tt) => (
                    <option key={tt._id} value={tt._id}>Class {tt.class}-{tt.section} ({tt.academicYear})</option>
                  ))}
                </select>
              </div>

              {selectedTt ? (
                <SubstituteForm
                  timetable={selectedTt}
                  slots={slots}
                  onSuccess={() => { setShowForm(false); setSelectedTt(null); }}
                  onCancel={() => setShowForm(false)}
                />
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Select a class above to continue.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#5B21B6] animate-spin" /></div>
      ) : substitutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarClock className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-400">No substitutes for this date</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {substitutes.map((sub) => {
            const slot = slots.find((s) => s._id === sub.slotId);
            return (
              <SubstituteRow
                key={sub._id}
                sub={sub}
                slotName={slot?.name}
                slotTime={slot ? `${slot.startTime}–${slot.endTime}` : undefined}
                canManage={canManage}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const SubstituteRow = ({
  sub, slotName, slotTime, canManage,
}: {
  sub: ReturnType<typeof useSubstitutes>['data'] extends { data: (infer T)[] } | undefined ? T : never;
  slotName?: string;
  slotTime?: string;
  canManage: boolean;
}) => {
  const [confirmDel, setConfirmDel]               = useState(false);
  const { mutate: update, isPending: upPending }   = useUpdateSubstitute(sub._id);

  const isCancelled = sub.status === 'cancelled';

  return (
    <div className={`bg-white rounded-2xl border ${isCancelled ? 'border-gray-100 opacity-60' : 'border-gray-100'} shadow-sm p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">
              Class {sub.class}-{sub.section}
            </span>
            <span className="text-sm text-gray-500">·</span>
            <span className="text-sm text-gray-600">{slotName ?? 'Unknown period'}</span>
            {slotTime && <span className="text-xs text-gray-400">({slotTime})</span>}
          </div>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Subject:</span> {sub.subjectName}
          </p>
          {sub.originalTeacherName && (
            <p className="text-xs text-gray-500">Original: {sub.originalTeacherName}</p>
          )}
          <p className="text-sm text-[#4C1D95] font-semibold">
            Substitute: {sub.substituteTeacherName}
          </p>
          {sub.reason && <p className="text-xs text-gray-500">Reason: {sub.reason}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isCancelled ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {isCancelled ? 'Cancelled' : 'Active'}
          </span>
          {canManage && !isCancelled && !confirmDel && (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="text-xs text-red-500 hover:text-red-700 font-semibold"
            >
              Cancel
            </button>
          )}
          {canManage && confirmDel && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-red-600 font-medium">Cancel?</span>
              <button type="button" onClick={() => update({ status: 'cancelled' }, { onSuccess: () => setConfirmDel(false) })}
                disabled={upPending}
                className="font-bold text-red-600 hover:text-red-800 disabled:opacity-50">Yes</button>
              <button type="button" onClick={() => setConfirmDel(false)}
                className="font-bold text-gray-400 hover:text-gray-700">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
