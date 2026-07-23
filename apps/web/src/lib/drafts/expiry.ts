export function isExpired(updatedAt: number, maxAgeDays = 7): boolean {
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return Date.now() - updatedAt > maxAgeMs;
}
