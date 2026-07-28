import axios from 'axios';

/**
 * POST with a few retries on failure (exponential backoff) — for fire-and-forget
 * webhook dispatches (n8n) that previously gave up silently after one failed
 * attempt. A transient blip on the receiving end (n8n restart, brief network
 * hiccup) no longer just drops the notification/call trigger.
 *
 * Still fire-and-forget from the caller's perspective — callers `void` this
 * and rely on the resolved/rejected promise only for logging, same as before.
 */
export async function postWithRetry(
  url: string,
  body: unknown,
  opts: { timeoutMs?: number; attempts?: number } = {},
): Promise<void> {
  const timeout = opts.timeoutMs ?? 8_000;
  const attempts = opts.attempts ?? 3;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await axios.post(url, body, { timeout });
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        const backoffMs = 500 * 2 ** (attempt - 1); // 500ms, 1s, 2s, ...
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  throw lastErr;
}
