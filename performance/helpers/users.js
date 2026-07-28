// Loads the fixture written by
// `npm run seed:perf-test-data -w apps/server` (apps/server/src/scripts/seed-perf-test-data.ts)
// and exposes it as SharedArray-backed pools so every VU pulls from the same
// in-memory copy instead of each VU re-parsing the JSON file.
import { SharedArray } from 'k6/data';
import { FIXTURE_PATH } from '../config/base.js';

function loadFixture() {
  const raw = open(FIXTURE_PATH);
  const parsed = JSON.parse(raw);
  if (!parsed || !parsed.schoolId) {
    throw new Error(
      `Perf-test fixture at ${FIXTURE_PATH} looks empty or malformed. ` +
      `Run "npm run seed:perf-test-data -w apps/server" first.`
    );
  }
  return parsed;
}

// SharedArray requires its callback to return an array — we wrap the whole
// fixture object as a single-element array and unwrap it below, which is the
// documented pattern for sharing a non-array structure across VUs.
const fixtureArray = new SharedArray('perf-test-fixture', () => [loadFixture()]);
export const fixture = fixtureArray[0];

export const schoolId = fixture.schoolId;
export const password = fixture.password;

export function randomTeacher() {
  const list = fixture.users.teacher;
  return list[Math.floor(Math.random() * list.length)];
}

// Deterministic 1:1 mapping instead of randomTeacher()'s shared-pool pick —
// used by validate-100-teachers.js / mixed-workload.js so each of the N VUs
// gets a distinct seeded teacher account (own class/section) rather than
// several VUs racing to log in as, and mark attendance for, the same
// teacher. Wraps around (modulo) if there are fewer seeded teachers than
// VUs, so an under-scaled fixture degrades to sharing rather than crashing.
export function teacherByIndex(index) {
  const list = fixture.users.teacher;
  if (!list || list.length === 0) {
    throw new Error('No seeded teachers — check performance/data/perf-test-context.json');
  }
  return list[index % list.length];
}

// Deterministic counterpart to randomFromRole(), same rationale as
// teacherByIndex() above — used by mixed-workload.js so each VU in a role
// gets a distinct seeded account (wraps around if under-scaled).
export function fromRoleByIndex(role, index) {
  const list = fixture.users[role];
  if (!list || list.length === 0) {
    throw new Error(`No seeded users for role "${role}" — check performance/data/perf-test-context.json`);
  }
  return list[index % list.length];
}

export function randomFromRole(role) {
  const list = fixture.users[role];
  if (!list || list.length === 0) {
    throw new Error(`No seeded users for role "${role}" — check performance/data/perf-test-context.json`);
  }
  return list[Math.floor(Math.random() * list.length)];
}

export function randomStudent() {
  const list = fixture.students;
  return list[Math.floor(Math.random() * list.length)];
}

export function randomPayableFeeRecord() {
  const list = fixture.payableFeeRecords;
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function randomClass() {
  const list = fixture.classes;
  return list[Math.floor(Math.random() * list.length)];
}
