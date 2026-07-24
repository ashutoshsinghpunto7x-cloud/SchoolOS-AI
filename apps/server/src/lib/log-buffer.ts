// In-process log ring buffer for the Ops Center Logs viewer. Populated by a
// side-effect winston format (see logger.ts) so every logger.info/warn/error
// call anywhere in the app is captured here too, in addition to the console
// transport. Single-process only — resets on restart, not persisted.

export interface BufferedLogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
}

const MAX_ENTRIES = 2000;
const buffer: BufferedLogEntry[] = [];
let seq = 0;

export function pushLog(entry: Omit<BufferedLogEntry, 'id'>): void {
  buffer.push({ ...entry, id: String(++seq) });
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

export interface GetLogsOptions {
  level?: string;
  search?: string;
  limit?: number;
}

export function getLogs(opts: GetLogsOptions = {}): BufferedLogEntry[] {
  let rows = buffer;

  if (opts.level) {
    rows = rows.filter((r) => r.level === opts.level);
  }
  if (opts.search) {
    const query = opts.search.toLowerCase();
    rows = rows.filter(
      (r) => r.message.toLowerCase().includes(query) || JSON.stringify(r.meta ?? {}).toLowerCase().includes(query),
    );
  }

  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  return rows.slice(-limit).reverse();
}
