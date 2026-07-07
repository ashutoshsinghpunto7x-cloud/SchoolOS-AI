import { useState } from 'react';
import { X, AlertCircle, CalendarDays, Sun } from 'lucide-react';
import { useCreateLeaveRequest } from '@/features/leave-requests/hooks/useLeaveRequests';
import type { LeaveType } from '@schoolos/types';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 ' +
  'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#0B3D2E] transition-colors';
const labelCls = 'text-xs font-semibold text-gray-500 mb-1 block';

const TYPES: { value: LeaveType; label: string; icon: React.ElementType }[] = [
  { value: 'full_day', label: 'Full day', icon: CalendarDays },
  { value: 'half_day', label: 'Half day', icon: Sun },
];

export function ApplyLeaveModal({ onClose, onSuccess }: Props) {
  const { mutateAsync: createLeaveRequest, isPending, error } = useCreateLeaveRequest();

  const [leaveType, setLeaveType] = useState<LeaveType>('full_day');
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  function handleTypeChange(type: LeaveType) {
    setLeaveType(type);
    if (type === 'half_day') setDateTo(dateFrom);
  }

  function handleFromChange(value: string) {
    setDateFrom(value);
    if (leaveType === 'half_day' || value > dateTo) setDateTo(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');

    if (!reason.trim()) {
      setLocalError('Please tell your principal why you need leave.');
      return;
    }
    if (dateTo < dateFrom) {
      setLocalError('End date cannot be before start date.');
      return;
    }

    await createLeaveRequest({
      leaveType,
      dateFrom,
      dateTo: leaveType === 'half_day' ? dateFrom : dateTo,
      reason: reason.trim(),
    });
    onSuccess?.();
    onClose();
  }

  const mutationError = error instanceof Error ? error.message : null;
  const displayError = localError || mutationError;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <h3 className="text-base font-bold text-gray-900">Apply for Leave</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100" type="button">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Leave type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTypeChange(value)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-2 font-semibold text-xs transition-colors',
                    leaveType === value
                      ? 'border-[#0B3D2E] bg-[#10B981]/5 text-[#0B3D2E]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{leaveType === 'half_day' ? 'Date' : 'From'}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleFromChange(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            {leaveType === 'full_day' && (
              <div>
                <label className={labelCls}>To</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Family function, feeling unwell…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#0B3D2E] transition-colors resize-none"
            />
          </div>

          {displayError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-[#0B3D2E] hover:bg-[#08251B] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
