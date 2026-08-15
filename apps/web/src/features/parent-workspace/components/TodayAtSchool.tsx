import type { ScheduleEntry } from '../types';
import { ScheduleTimeline } from './ScheduleTimeline';

interface TodayAtSchoolProps {
  schedule: ScheduleEntry[];
}

export function TodayAtSchool({ schedule }: TodayAtSchoolProps) {
  return (
    <section aria-labelledby="today-heading" className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-7 sm:py-7">
      <h2 id="today-heading" className="text-lg font-bold text-gray-900">
        Today at School
      </h2>
      <div className="mt-5">
        <ScheduleTimeline schedule={schedule} />
      </div>
    </section>
  );
}
