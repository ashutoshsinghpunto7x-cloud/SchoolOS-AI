/**
 * Simple counting semaphore — bounds how many async operations run at once, queueing the rest
 * (FIFO) instead of rejecting or racing them. No new dependency needed for a fixed-size pool.
 * Used to cap global concurrency into external APIs with a shared rate limit (see openai.provider).
 */
export class Semaphore {
  private available: number;
  private readonly waiters: (() => void)[] = [];

  constructor(max: number) {
    this.available = max;
  }

  /** Runs `fn` once a slot is free, releasing the slot (to the next waiter, if any) when it settles. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      // Hand the freed slot straight to the next waiter rather than incrementing `available`
      // and letting them race to acquire() it.
      next();
    } else {
      this.available++;
    }
  }
}
