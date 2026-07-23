import { getNotificationSoundEnabled } from '../utils/notificationSoundPref';

export type NotificationSoundType = 'default' | 'leave-request' | 'approval' | 'emergency';

// All types share one clip for now — separate assets can be dropped in later
// without touching call sites, since lookup goes through this map.
const SOUND_SOURCES: Record<NotificationSoundType, string> = {
  default: '/sounds/notification-default.wav',
  'leave-request': '/sounds/notification-default.wav',
  approval: '/sounds/notification-default.wav',
  emergency: '/sounds/notification-default.wav',
};

const audioCache = new Map<string, HTMLAudioElement>();
let unlocked = false;

function getAudio(src: string): HTMLAudioElement {
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.55;
    audioCache.set(src, audio);
  }
  return audio;
}

// Browsers block audio playback before any user interaction with the page.
// Silently "prime" every cached clip on the first click/keypress/touch so
// later programmatic play() calls (triggered by a poll response, not a
// gesture) succeed without throwing or logging autoplay warnings.
function unlockOnFirstInteraction() {
  if (unlocked || typeof document === 'undefined') return;
  const unlock = () => {
    unlocked = true;
    for (const audio of audioCache.values()) {
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    document.removeEventListener('touchstart', unlock);
  };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
}

// Preload eagerly so the clip is ready to play instantly once unlocked.
for (const src of Object.values(SOUND_SOURCES)) getAudio(src);
unlockOnFirstInteraction();

export function playNotificationSound(type: NotificationSoundType = 'default'): void {
  if (!getNotificationSoundEnabled()) return;
  const audio = getAudio(SOUND_SOURCES[type]);
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Autoplay still blocked (no interaction yet on this page load) — drop
    // silently, this is expected and not worth surfacing to the user.
  });
}
