import { CalendarDays, MapPin } from 'lucide-react';
import type { SchoolUpdate } from '../types';

interface SchoolUpdatesProps {
  updates: SchoolUpdate[];
}

export function SchoolUpdates({ updates }: SchoolUpdatesProps) {
  return (
    <section aria-labelledby="updates-heading" className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-7 sm:py-7">
      <h2 id="updates-heading" className="text-lg font-bold text-gray-900">
        School Updates
      </h2>

      {updates.length === 0 ? (
        <p className="text-sm text-gray-500 mt-4">Nothing scheduled yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-gray-100">
          {updates.map((u) => (
            <li key={u._id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <span className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-purple-600" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-base text-gray-900">{u.title}</span>
                <span className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5 flex-wrap">
                  {u.when}
                  {u.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
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
