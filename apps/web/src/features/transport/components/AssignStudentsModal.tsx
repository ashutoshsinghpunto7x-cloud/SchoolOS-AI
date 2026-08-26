import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Search, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentsPaginated } from '@/features/students/hooks/useStudents';
import { useAssignStudents, useVehicleStudents } from '../hooks/useTransport';
import type { VehicleView } from '../types';

interface AssignStudentsModalProps {
  vehicle: VehicleView;
  onClose: () => void;
}

// Reuses the filterable checkbox multi-select pattern from
// BulkCreateParentsModal (students feature) rather than introducing a new
// generic picker component.
export const AssignStudentsModal = ({ vehicle, onClose }: AssignStudentsModalProps) => {
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: existingIds } = useVehicleStudents(vehicle._id);
  useEffect(() => {
    if (existingIds) setSelected(new Set(existingIds));
  }, [existingIds]);

  const { data, isLoading } = useStudentsPaginated({
    limit: 500,
    class: classFilter || undefined,
    section: sectionFilter || undefined,
    search: search || undefined,
    status: 'active',
  });
  const students = useMemo(() => data?.data ?? [], [data]);

  const { mutateAsync: assignStudents, isPending } = useAssignStudents();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = students.length > 0 && students.every((s) => selected.has(s._id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) students.forEach((s) => next.delete(s._id));
      else students.forEach((s) => next.add(s._id));
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      await assignStudents({ vehicleId: vehicle._id, studentIds: [...selected] });
      toast.success('Students assigned to vehicle');
      onClose();
    } catch (err) {
      toast.error('Failed to assign students', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Students</h2>
            <p className="text-sm text-gray-500 mt-0.5">{vehicle.vehicleNumber} · {vehicle.routeName}</p>
          </div>
          <button onClick={onClose} type="button" className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or admission no…"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent"
            />
          </div>
          <input
            type="text"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            placeholder="Class"
            className="w-full sm:w-28 h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent"
          />
          <input
            type="text"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            placeholder="Section"
            className="w-full sm:w-28 h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent"
          />
        </div>

        <div className="px-6 pt-3 flex-1 overflow-y-auto min-h-[240px]">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-bold text-[#5B21B6] mb-2"
            disabled={students.length === 0}
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allSelected ? 'Deselect all' : `Select all (${students.length})`}
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-16">No students match these filters.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
              {students.map((s) => (
                <label key={s._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(s._id)}
                    onChange={() => toggle(s._id)}
                    className="w-4 h-4 accent-[#5B21B6]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                    <p className="text-xs text-gray-500">{s.class}-{s.section} · {s.admissionNumber}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isPending}
            className="flex-1 h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPending ? 'Saving…' : `Save (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};
