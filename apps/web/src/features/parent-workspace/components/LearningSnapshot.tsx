import { useNavigate } from 'react-router-dom';
import type { SubjectSnapshot } from '../types';
import { SubjectProgress } from './SubjectProgress';

interface LearningSnapshotProps {
  subjects: SubjectSnapshot[];
}

export function LearningSnapshot({ subjects }: LearningSnapshotProps) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="learning-heading" className="bg-white rounded-2xl border border-[#E7E4DE] px-6 py-6 sm:px-7 sm:py-7">
      <h2 id="learning-heading" className="text-base font-medium text-[#0D0D0D]">
        Learning Snapshot
      </h2>

      {subjects.length === 0 ? (
        <p className="text-sm text-[#6B6B6B] mt-4">
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
        className="text-sm text-[#A6752F] hover:opacity-70 transition-opacity mt-6 font-medium"
      >
        View academic report →
      </button>
    </section>
  );
}
