import { INTERNAL_SCHOOL_ID } from '../features/users/user.model';

/** schoolIds that are seed/perf-test/internal tenants, not a real customer
 *  school — used to auto-flag `SchoolSettings.isTestTenant` on creation so
 *  Ops Center excludes them without relying on every seed script remembering to. */
const KNOWN_TEST_SCHOOL_IDS = new Set([INTERNAL_SCHOOL_ID, 'DEMO_SCHOOL', 'PERF_TEST_SCHOOL']);

export function isKnownTestSchoolId(schoolId: string): boolean {
  return KNOWN_TEST_SCHOOL_IDS.has(schoolId) || /_TEST_SCHOOL$/i.test(schoolId) || /^(DEMO|TEST|PERF)_/i.test(schoolId);
}
