import type { ScheduleEntry } from '../types';
import { ScheduleTimeline } from './ScheduleTimeline';

interface TodayAtSchoolProps {
  schedule: ScheduleEntry[];
}

export function TodayAtSchool({ schedule }: TodayAtSchoolProps) {
  return (
    <section aria-labelledby="today-heading" className="bg-white rounded-2xl border border-[#E7E4DE] px-6 py-6 sm:px-7 sm:py-7">
      <h2 id="today-heading" className="text-base font-medium text-[#0D0D0D]">
        Today at School
      </h2>
      <div className="mt-5">
        <ScheduleTimeline schedule={schedule} />
      </div>
    </section>
  );
}
