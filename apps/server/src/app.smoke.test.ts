import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// Env must be set before the app module reads and validates it.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/unit-test-unused';
process.env.JWT_ACCESS_SECRET ??= 'unit-test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'unit-test-refresh-secret';

let server: Server;
let base: string;

beforeAll(async () => {
  const { default: app } = await import('./app');
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 90_000); // importing the app loads every route module, which is slow on CI runners

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('app smoke', () => {
  it('answers /healthz without touching the database', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('ok');
  });

  it('sets security headers on API routes', async () => {
    const res = await fetch(`${base}/api/v1/nonexistent`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('never returns data to an anonymous caller on a protected route', async () => {
    const res = await fetch(`${base}/api/v1/students`);
    expect(res.status).not.toBe(200);
  });
});
