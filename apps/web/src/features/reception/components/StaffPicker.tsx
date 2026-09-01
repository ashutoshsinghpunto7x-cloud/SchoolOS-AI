import { useEffect, useRef, useState } from 'react';
import { Search, User } from 'lucide-react';
import { useEmployeeDirectory } from '@/features/employees/hooks/useEmployees';

interface StaffPickerProps {
  /** Free-text fallback shown when nothing's been picked from the directory yet. */
  value: string;
  onChangeText: (text: string) => void;
  onPick: (id: string, name: string) => void;
  placeholder?: string;
}

/** Search-as-you-type staff lookup for Visitor Management's "person to
 *  visit" field. Stays a free-text input if reception just types a name
 *  (e.g. a department, or someone not in the directory) — picking a result
 *  additionally sets personToVisitId so the arrival notification can reach
 *  them (see visitor.service.ts notifyStaffOfArrival). */
export function StaffPicker({ value, onChangeText, onPick, placeholder }: StaffPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: results, isFetching } = useEmployeeDirectory(value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChangeText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Search staff, or type a name/department'}
          required
          className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        />
      </div>
      {open && value.trim().length >= 2 && (
        <div className="absolute z-20 left-0 right-0 top-[calc(100%+4px)] bg-white rounded-lg border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
          {isFetching ? (
            <p className="px-3 py-2.5 text-xs text-gray-400">Searching…</p>
          ) : results && results.length > 0 ? (
            results.map((r) => (
              <button
                key={r._id}
                type="button"
                onClick={() => { onPick(r._id, r.fullName); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-orange-50 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{r.fullName}</span>
                  <span className="block text-xs text-gray-400 truncate">
                    {r.designation}{r.department ? ` · ${r.department}` : ''}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-xs text-gray-400">
              No staff match — this will be saved as free text ("{value}").
            </p>
          )}
        </div>
      )}
    </div>
  );
}
