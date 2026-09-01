/**
 * Migrates existing Teacher Planner v2 data (TeacherPlanner) into the
 * Academic Planning Engine's AcademicPlan collection — Phase 5 of "The
 * Planning Engine" design doc's rollout ("Migration & Roadmap").
 *
 * For each TeacherPlanner:
 *  - Skipped if that teacher already has an AcademicPlan for the same
 *    class+subject (any section) — they've already moved to v3 via the
 *    engine's own /academic-plan/generate, which is the authoritative path;
 *    this script never overwrites a real v3 plan.
 *  - Otherwise, its weeks/tasks are flattened into AcademicPlan.days:
 *      task.type 'unit_test' -> blockType 'assessment'
 *      task.type 'revision'  -> blockType 'revision'
 *      everything else       -> blockType 'teach'
 *    status maps 'completed'->'completed', 'pending'->'pending' (v2 has no
 *    partial/carried_forward/needs_extra_class states to preserve).
 *  - `section` is left unset — v2 never tracked one, so a migrated plan
 *    can't claim to know a teacher's real section. Sizing/exam-awareness
 *    only apply once the teacher regenerates via the real engine; this
 *    migration exists purely to not lose their recorded progress.
 *  - An AcademicYear is found-or-created from the planner's own
 *    academicYearStart/End so migrated plans always reference a real one.
 *
 * Idempotent: re-running skips every planner that already produced (or
 * otherwise already has) an AcademicPlan.
 *
 * Run (dry run first, always):
 *   npm run migrate:teacher-planner-v3 -w apps/server -- --dry-run
 *   npm run migrate:teacher-planner-v3 -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { TeacherPlanner, IPlannerWeek } from '../features/teacher-planner/planner.model';
import { AcademicYear } from '../features/academic-year/academic-year.model';
import { AcademicPlan, IAcademicPlanDay, AcademicPlanBlockType } from '../features/academic-plan/academic-plan.model';
import { academicPlanRepository } from '../features/academic-plan/academic-plan.repository';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DRY_RUN = process.argv.includes('--dry-run');

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function blockTypeFor(taskType: string): AcademicPlanBlockType {
  if (taskType === 'unit_test') return 'assessment';
  if (taskType === 'revision') return 'revision';
  return 'teach';
}

function weeksToDays(weeks: IPlannerWeek[]): IAcademicPlanDay[] {
  return weeks.flatMap((week) =>
    week.tasks.map((task) => {
      const blockType = blockTypeFor(task.type);
      return {
        date: task.dueDate,
        blockType,
        chapterId: blockType === 'teach' ? week.chapterId : undefined,
        chapterName: blockType === 'teach' ? week.chapterName : undefined,
        topicTitle: blockType === 'teach' ? task.title : undefined,
        examName: blockType !== 'teach' ? task.title : undefined,
        status: task.status === 'completed' ? 'completed' : 'pending',
      } as IAcademicPlanDay;
    }),
  );
}

const academicYearCache = new Map<string, string>();

async function resolveAcademicYearId(schoolId: string, start: Date, end: Date): Promise<string> {
  const key = `${schoolId}|${isoDate(start)}|${isoDate(end)}`;
  const cached = academicYearCache.get(key);
  if (cached) return cached;

  let year = await AcademicYear.findOne({ schoolId, startDate: start, endDate: end });
  if (!year) {
    year = await AcademicYear.create({
      schoolId, label: `${start.getFullYear()}-${end.getFullYear()}`,
      startDate: start, endDate: end, weeklyOffDays: [0, 6], terms: [], status: 'active',
    });
  }
  const id = String(year._id);
  academicYearCache.set(key, id);
  return id;
}

async function migrate(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB${DRY_RUN ? ' (dry run — nothing will be written)' : ''}`);

  const planners = await TeacherPlanner.find({}).lean();
  console.log(`Found ${planners.length} Teacher Planner v2 record(s)`);

  let migrated = 0;
  let skippedHasV3 = 0;
  let skippedEmpty = 0;

  for (const planner of planners) {
    const alreadyOnV3 = await AcademicPlan.exists({
      schoolId: planner.schoolId, teacherId: planner.teacherId, class: planner.class, subject: planner.subject,
    });
    if (alreadyOnV3) { skippedHasV3++; continue; }

    const days = weeksToDays(planner.weeks);
    if (days.length === 0) { skippedEmpty++; continue; }

    if (!DRY_RUN) {
      const academicYearId = await resolveAcademicYearId(planner.schoolId, planner.academicYearStart, planner.academicYearEnd);
      await academicPlanRepository.upsert({
        schoolId: planner.schoolId,
        academicYearId,
        teacherId: planner.teacherId,
        class: planner.class,
        section: undefined,
        subject: planner.subject,
        days,
        historyEntry: {
          version: 0, changedBy: 'system:migration', changedAt: new Date(),
          reason: 'Migrated from Teacher Planner v2 — regenerate via the Academic Planning Engine for exam-aware scheduling.',
        },
      });
    }
    migrated++;
  }

  console.log(`✓ Migrated: ${migrated}`);
  console.log(`  Skipped (already has a v3 plan): ${skippedHasV3}`);
  console.log(`  Skipped (no tasks to migrate): ${skippedEmpty}`);
  if (DRY_RUN) console.log('\nDry run only — re-run without --dry-run to write these changes.');

  await mongoose.disconnect();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
