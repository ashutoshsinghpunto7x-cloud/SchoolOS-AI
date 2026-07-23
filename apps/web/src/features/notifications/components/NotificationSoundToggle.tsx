import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNotificationSoundEnabled, setNotificationSoundEnabled } from '../utils/notificationSoundPref';

/** Simple on/off pill for the "Notification Sounds" preference — settings page row. */
export function NotificationSoundToggle() {
  const [enabled, setEnabled] = useState(getNotificationSoundEnabled);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    setNotificationSoundEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={enabled ? 'Turn off notification sounds' : 'Turn on notification sounds'}
      aria-pressed={enabled}
      title={enabled ? 'Turn off notification sounds' : 'Turn on notification sounds'}
      className="relative flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/50 rounded-full"
    >
      <span
        className={cn(
          'flex items-center h-7 w-12 rounded-full px-1 transition-colors duration-200',
          enabled ? 'bg-[#5B21B6] justify-end' : 'bg-gray-200 justify-start'
        )}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200">
          {enabled ? (
            <Volume2 className="w-3 h-3 text-[#5B21B6]" strokeWidth={2} />
          ) : (
            <VolumeX className="w-3 h-3 text-gray-400" strokeWidth={2} />
          )}
        </span>
      </span>
    </button>
  );
}
