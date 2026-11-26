/**
 * Shared constants + helpers for the pitch-demo seed (seed-pitch-demo.ts).
 * Everything is scoped to schoolId = 'DEMO_SCHOOL'. A seeded PRNG keeps the
 * generated data identical from run to run, so a re-seed never changes the
 * numbers a presenter has memorised.
 */
import { AuthContext } from '../../lib/auth-context';

export const SCHOOL_ID = 'DEMO_SCHOOL';
export const SCHOOL_NAME = 'Greenwood International School';
export const PASSWORD = 'Demo@123';
export const SALT_ROUNDS = 12; // must match auth.service.ts
export const ACADEMIC_YEAR = '2026-27';
export const SEEDER = 'pitch-demo seed';

export const SUBJECTS = ['Maths', 'Science', 'English', 'Hindi', 'Social Studies'] as const;
export type Subject = (typeof SUBJECTS)[number];

export interface ClassSection { cls: string; section: string }
export const CLASS_SECTIONS: ClassSection[] = [
  { cls: '6', section: 'A' },
  { cls: '6', section: 'B' },
  { cls: '7', section: 'A' },
  { cls: '7', section: 'B' },
  { cls: '8', section: 'A' },
];
export const CLASSES = ['6', '7', '8'];

// ── Seeded PRNG (mulberry32) ────────────────────────────────────────────────
let _state = 20261126;
export function rand(): number {
  _state |= 0; _state = (_state + 0x6d2b79f5) | 0;
  let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
export const randInt = (min: number, max: number): number => Math.floor(rand() * (max - min + 1)) + min;
/** Approximately normal (sum of uniforms). */
export function gauss(mean: number, sd: number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rand();
  return mean + (s - 3) * sd * 1.41;
}
export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export function phone(): string {
  let rest = '';
  for (let i = 0; i < 9; i++) rest += randInt(0, 9);
  if (/^(\d)\1{8}$/.test(rest)) return phone();
  return pick(['7', '8', '9']) + rest;
}

// ── Dates ───────────────────────────────────────────────────────────────────
export const iso = (d: Date): string => d.toISOString().split('T')[0];
export const daysAgo = (n: number): Date => { const d = new Date(); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
export const daysFromNow = (n: number): Date => daysAgo(-n);
export const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function at(date: Date, hh: number, mm = 0): Date {
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

// ── People pools ────────────────────────────────────────────────────────────
export const SURNAMES = ['Yadav', 'Verma', 'Mishra', 'Tiwari', 'Singh', 'Gupta', 'Sharma', 'Pandey', 'Khan', 'Srivastava', 'Agarwal', 'Joshi', 'Chauhan', 'Bhatia', 'Malhotra', 'Saxena'];
export const BOYS = ['Aarav', 'Rohan', 'Aditya', 'Vivaan', 'Krishna', 'Aryan', 'Arjun', 'Kabir', 'Ansh', 'Om', 'Yash', 'Vihaan', 'Reyansh', 'Ishaan', 'Dev', 'Shaurya'];
export const GIRLS = ['Priya', 'Ananya', 'Kavya', 'Sanya', 'Diya', 'Ishita', 'Saanvi', 'Riya', 'Anaya', 'Khushi', 'Simran', 'Divya', 'Myra', 'Tara', 'Navya', 'Pari'];
export const FATHERS = ['Rajesh', 'Sanjay', 'Anil', 'Suresh', 'Manoj', 'Ramesh', 'Vinod', 'Dinesh', 'Ashok', 'Pradeep', 'Naveen', 'Alok'];
export const MOTHERS = ['Sunita', 'Rekha', 'Kavita', 'Anita', 'Meena', 'Poonam', 'Shobha', 'Nirmala', 'Kiran', 'Geeta', 'Seema', 'Neelam'];

// ── Teacher plan: one subject specialist each, all five sections ────────────
export interface TeacherPlan {
  index: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  subject: Subject;
  classTeacherOf: ClassSection;
  designation: string;
}
export const TEACHERS: TeacherPlan[] = [
  { index: 1, email: 'demoteacher1@demo.schoolos.ai', username: 'demoteacher1', firstName: 'Anjali', lastName: 'Sharma', gender: 'female', subject: 'Maths', classTeacherOf: CLASS_SECTIONS[0], designation: 'Senior Teacher — Maths' },
  { index: 2, email: 'demoteacher2@demo.schoolos.ai', username: 'demoteacher2', firstName: 'Rahul', lastName: 'Verma', gender: 'male', subject: 'Science', classTeacherOf: CLASS_SECTIONS[1], designation: 'Teacher — Science' },
  { index: 3, email: 'demoteacher3@demo.schoolos.ai', username: 'demoteacher3', firstName: 'Priya', lastName: 'Nair', gender: 'female', subject: 'English', classTeacherOf: CLASS_SECTIONS[2], designation: 'Teacher — English' },
  { index: 4, email: 'demoteacher4@demo.schoolos.ai', username: 'demoteacher4', firstName: 'Vikram', lastName: 'Rao', gender: 'male', subject: 'Hindi', classTeacherOf: CLASS_SECTIONS[3], designation: 'Teacher — Hindi' },
  { index: 5, email: 'demoteacher5@demo.schoolos.ai', username: 'demoteacher5', firstName: 'Sneha', lastName: 'Iyer', gender: 'female', subject: 'Social Studies', classTeacherOf: CLASS_SECTIONS[4], designation: 'Teacher — Social Studies' },
];

export interface StaffPlan {
  key: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'principal' | 'incharge' | 'admin' | 'reception' | 'accountant' | 'operations_manager' | 'academic_coordinator' | 'driver';
  employeeRole: 'principal' | 'vice_principal' | 'receptionist' | 'accountant' | 'driver' | 'other';
  designation: string;
  gender: 'male' | 'female';
  salary: number;
  dashboard: string;
}
export const STAFF: StaffPlan[] = [
  { key: 'principal', email: 'demoprincipal@demo.schoolos.ai', username: 'demoprincipal', firstName: 'Meera', lastName: 'Kapoor', role: 'principal', employeeRole: 'principal', designation: 'Principal', gender: 'female', salary: 27500, dashboard: 'Principal' },
  { key: 'incharge', email: 'demoincharge@demo.schoolos.ai', username: 'demoincharge', firstName: 'Arvind', lastName: 'Mehta', role: 'incharge', employeeRole: 'vice_principal', designation: 'Vice Principal / Incharge', gender: 'male', salary: 19200, dashboard: 'Incharge' },
  { key: 'admin', email: 'demoadmin@demo.schoolos.ai', username: 'demoadmin', firstName: 'Neha', lastName: 'Bansal', role: 'admin', employeeRole: 'other', designation: 'School Administrator', gender: 'female', salary: 15400, dashboard: 'Admin' },
  { key: 'reception', email: 'demoreception@demo.schoolos.ai', username: 'demoreception', firstName: 'Kavita', lastName: 'Rao', role: 'reception', employeeRole: 'receptionist', designation: 'Front Office Executive', gender: 'female', salary: 7700, dashboard: 'Reception' },
  { key: 'accountant', email: 'demoaccountant@demo.schoolos.ai', username: 'demoaccountant', firstName: 'Rajesh', lastName: 'Gupta', role: 'accountant', employeeRole: 'accountant', designation: 'Accountant', gender: 'male', salary: 11000, dashboard: 'Accountant' },
  { key: 'operations', email: 'demooperations@demo.schoolos.ai', username: 'demooperations', firstName: 'Harish', lastName: 'Malhotra', role: 'operations_manager', employeeRole: 'other', designation: 'Operations Manager', gender: 'male', salary: 12100, dashboard: 'Operations Manager' },
  { key: 'coordinator', email: 'demoacademic@demo.schoolos.ai', username: 'demoacademic', firstName: 'Sunita', lastName: 'Joshi', role: 'academic_coordinator', employeeRole: 'other', designation: 'Academic Coordinator', gender: 'female', salary: 13800, dashboard: 'Academic Coordinator' },
  { key: 'driver1', email: 'demodriver@demo.schoolos.ai', username: 'demodriver', firstName: 'Suresh', lastName: 'Kumar', role: 'driver', employeeRole: 'driver', designation: 'Bus Driver — Route 1', gender: 'male', salary: 6600, dashboard: 'Driver' },
  { key: 'driver2', email: 'demodriver2@demo.schoolos.ai', username: 'demodriver2', firstName: 'Mahesh', lastName: 'Yadav', role: 'driver', employeeRole: 'driver', designation: 'Bus Driver — Route 2', gender: 'male', salary: 6600, dashboard: 'Driver (Route 2)' },
];

/** Non-login support staff — they only show up in HR / payroll / attendance. */
export const SUPPORT_STAFF = [
  { name: 'Ramkishan Lal', role: 'peon' as const, designation: 'Peon', gender: 'male' as const, salary: 4400 },
  { name: 'Shanti Devi', role: 'peon' as const, designation: 'Attendant', gender: 'female' as const, salary: 4100 },
  { name: 'Deepak Chaudhary', role: 'librarian' as const, designation: 'Librarian', gender: 'male' as const, salary: 6600 },
  { name: 'Babulal Singh', role: 'other' as const, designation: 'Security Guard', gender: 'male' as const, salary: 5000 },
];

export const PARENTS = [
  { email: 'demoparent@demo.schoolos.ai', username: 'demoparent', firstName: 'Ekansh', lastName: 'Sharma', childIdx: [0, 20] },
  { email: 'demoparent2@demo.schoolos.ai', username: 'demoparent2', firstName: 'Pooja', lastName: 'Verma', childIdx: [41] },
];

export function ctxOf(userId: string, displayName: string, role: string): AuthContext {
  return { userId, schoolId: SCHOOL_ID, displayName, role };
}

/** Grade for a percentage — same A+/A/B/C/D scale the report-card template uses. */
export function gradeFor(pct: number): string {
  if (pct >= 91) return 'A+';
  if (pct >= 75) return 'A';
  if (pct >= 55) return 'B';
  if (pct >= 35) return 'C';
  return 'D';
}
export const GRADING_BANDS = [
  { label: 'A+', minPercent: 91, maxPercent: 100 },
  { label: 'A', minPercent: 75, maxPercent: 90 },
  { label: 'B', minPercent: 55, maxPercent: 74 },
  { label: 'C', minPercent: 35, maxPercent: 54 },
  { label: 'D', minPercent: 0, maxPercent: 34 },
];

export function log(msg: string): void {
  console.log(msg);
}
