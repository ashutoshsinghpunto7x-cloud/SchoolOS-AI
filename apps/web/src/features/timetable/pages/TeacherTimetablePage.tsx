import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTeacherSchedule, usePeriodSlots } from '../hooks/useTimetable';
import { TimetableGrid } from '../components/TimetableGrid';
import { TimetableStatusBadge } from '../components/TimetableStatusBadge';

export const TeacherTimetablePage = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { data: timetables = [], isLoading } = useTeacherSchedule(teacherId!);
  const { data: slots = [] }                 = usePeriodSlots();
  const [selectedIdx, setSelectedIdx]        = useState(0);

  const selected = timetables[selectedIdx];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-screen-xl mx-auto flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Schedule</h1>
        <p className="text-sm text-gray-500 mt-0.5">Across all classes</p>
      </div>

      {timetables.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">No active timetables found for this teacher.</p>
        </div>
      ) : (
        <>
          {/* Class selector tabs */}
          {timetables.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {timetables.map((tt, i) => (
                <button
                  key={tt._id}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  className={`flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                    i === selectedIdx
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Class {tt.class}-{tt.section}
                  <TimetableStatusBadge status={tt.status} className="text-[10px] px-1.5 py-0.5" />
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    Class {selected.class}-{selected.section}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selected.academicYear}{selected.term ? ` · ${selected.term}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/timetable/${selected._id}`)}
                  className="text-sm text-blue-600 hover:underline font-semibold"
                >
                  View full timetable →
                </button>
              </div>
              <div className="p-4">
                <TimetableGrid
                  timetable={selected}
                  slots={slots}
                  readonly
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
