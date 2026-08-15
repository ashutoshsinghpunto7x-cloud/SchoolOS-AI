import { useNavigate } from 'react-router-dom';
import type { SubjectSnapshot } from '../types';
import { SubjectProgress } from './SubjectProgress';

interface LearningSnapshotProps {
  subjects: SubjectSnapshot[];
}

export function LearningSnapshot({ subjects }: LearningSnapshotProps) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="learning-heading" className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-7 sm:py-7 h-full flex flex-col">
      <h2 id="learning-heading" className="text-lg font-bold text-gray-900">
        Learning Snapshot
      </h2>

      {subjects.length === 0 ? (
        <p className="text-sm text-gray-500 mt-4">
          Academic insights will appear as your child's data updates.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {subjects.map((s) => (
            <SubjectProgress key={s._id} {...s} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/parent/academics')}
        className="text-sm text-purple-600 hover:text-purple-700 transition-colors mt-6 font-semibold"
      >
        View academic report →
      </button>
    </section>
  );
}
