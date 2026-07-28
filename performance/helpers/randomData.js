// Generators for data k6 creates *during* a run (new enquiries, new fee
// payments' idempotency keys, etc.) — distinct from helpers/users.js, which
// reads data the seed script already created. Keep these cheap: they run on
// every iteration, across up to hundreds of VUs.
const SURNAMES = ['Yadav', 'Verma', 'Mishra', 'Tiwari', 'Singh', 'Gupta', 'Sharma', 'Pandey', 'Khan', 'Srivastava'];
const BOY_FIRST_NAMES = ['Aarav', 'Rohan', 'Aditya', 'Vivaan', 'Krishna', 'Aryan', 'Arjun', 'Kabir', 'Ansh', 'Om'];
const GIRL_FIRST_NAMES = ['Priya', 'Ananya', 'Kavya', 'Sanya', 'Diya', 'Ishita', 'Saanvi', 'Riya', 'Anaya', 'Khushi'];
const PARENT_FIRST_NAMES = ['Rajesh', 'Sanjay', 'Anil', 'Suresh', 'Manoj', 'Sunita', 'Rekha', 'Kavita', 'Anita', 'Meena'];
const SOURCES = ['walk_in', 'website', 'referral', 'social_media', 'phone', 'email'];
const CLASS_LEVELS = ['5', '6', '7', '8', '9', '10'];

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomPhone() {
  const first = pick(['6', '7', '8', '9']);
  let rest = '';
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  return first + rest;
}

export function randomStudentName() {
  const isBoy = Math.random() < 0.5;
  const first = isBoy ? pick(BOY_FIRST_NAMES) : pick(GIRL_FIRST_NAMES);
  return { fullName: `${first} ${pick(SURNAMES)}`, gender: isBoy ? 'male' : 'female' };
}

export function randomEnquiryPayload() {
  const { fullName } = randomStudentName();
  return {
    studentName: fullName,
    interestedClass: pick(CLASS_LEVELS),
    parentName: `${pick(PARENT_FIRST_NAMES)} ${pick(SURNAMES)}`,
    parentPhone: randomPhone(),
    source: pick(SOURCES),
    stage: 'new_enquiry',
  };
}

// Unique-enough per-VU-per-iteration key so k6's own retried/duplicate fee
// payments (network flakiness, not app bugs) don't get miscounted as the app
// double-charging — the app is expected to honor this for idempotent writes.
export function idempotencyKey(vuId, iterationId) {
  return `k6-${vuId}-${iterationId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Must match the server's own "today" (attendance.repository.ts's todayString(),
// Asia/Kolkata) exactly, not UTC — a plain toISOString() split disagrees with IST
// for hours around each UTC midnight (IST is UTC+5:30), which used to be harmless
// but now hard-fails every attendance write once the server started enforcing a
// same-day-only edit window (date !== today -> ValidationError, see
// attendance.service.ts's assertAttendanceEditableForTeacher).
//
// Deliberately NOT toLocaleDateString(..., { timeZone: 'Asia/Kolkata' }): k6 runs
// on goja, a Go-based JS engine with no real Intl/timezone data, so locale and
// timeZone options are silently ignored there — it returned the engine's default
// (US MM/DD/YYYY) regardless of what was passed, which then failed the server's
// strict YYYY-MM-DD schema entirely. Plain UTC-offset arithmetic works identically
// in Node and goja since it never touches Intl.
export function todayIso() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
