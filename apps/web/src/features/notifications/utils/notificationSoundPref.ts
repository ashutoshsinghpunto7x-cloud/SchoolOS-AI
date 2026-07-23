const STORAGE_KEY = 'schoolos.notificationSoundsEnabled';

/** Default ON — absence of a stored value (or any value other than 'off') means enabled. */
export function getNotificationSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore storage failures (private browsing quota etc.)
  }
}
