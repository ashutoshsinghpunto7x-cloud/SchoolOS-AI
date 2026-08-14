import { CalendarDays, MapPin } from 'lucide-react';
import type { SchoolUpdate } from '../types';

interface SchoolUpdatesProps {
  updates: SchoolUpdate[];
}

export function SchoolUpdates({ updates }: SchoolUpdatesProps) {
  return (
    <section aria-labelledby="updates-heading" className="bg-white rounded-2xl border border-[#E7E4DE] px-6 py-6 sm:px-7 sm:py-7">
      <h2 id="updates-heading" className="text-base font-medium text-[#0D0D0D]">
        School Updates
      </h2>

      {updates.length === 0 ? (
        <p className="text-sm text-[#6B6B6B] mt-4">Nothing scheduled yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-[#E7E4DE]">
          {updates.map((u) => (
            <li key={u._id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <span className="w-9 h-9 rounded-full bg-[#F5F1EB] flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-[#1A1A1A]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-base text-[#0D0D0D]">{u.title}</span>
                <span className="flex items-center gap-1.5 text-sm text-[#6B6B6B] mt-0.5">
                  {u.when}
                  {u.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <MapPin className="w-3 h-3" strokeWidth={2} />
                      {u.location}
                    </>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
