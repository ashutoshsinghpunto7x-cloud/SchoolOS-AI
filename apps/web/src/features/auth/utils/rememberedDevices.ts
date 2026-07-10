const STORAGE_KEY = 'schoolos.pinDevices';

export interface RememberedDeviceEntry {
  email: string;
  deviceId: string;
  label?: string;
}

function readAll(): RememberedDeviceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RememberedDeviceEntry[]) : [];
  } catch {
    return [];
  }
}

export function getRememberedDevices(): RememberedDeviceEntry[] {
  return readAll();
}

export function saveRememberedDevice(email: string, deviceId: string, label?: string): void {
  const all = readAll().filter((d) => d.email.toLowerCase() !== email.toLowerCase());
  all.push({ email: email.toLowerCase(), deviceId, label });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function removeRememberedDevice(deviceId: string): void {
  const all = readAll().filter((d) => d.deviceId !== deviceId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
