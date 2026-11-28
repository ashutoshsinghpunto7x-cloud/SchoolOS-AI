import { describe, expect, it } from 'vitest';
import { applyPlanOperations, planOperationSchema, PlanOperation } from './plan-assistant.ops';
import type { IAcademicPlanDay } from './academic-plan.model';

const day = (date: string, extra: Partial<IAcademicPlanDay> = {}): IAcademicPlanDay => ({
  date: new Date(`${date}T00:00:00Z`), blockType: 'teach', status: 'pending', ...extra,
});

const PLAN: IAcademicPlanDay[] = [
  day('2026-11-30', { chapterName: 'Algebra', topicTitle: 'Intro', homeWork: 'Ex 1', status: 'completed' }),
  day('2026-12-01', { chapterName: 'Algebra', topicTitle: 'Terms' }),
  day('2026-12-02', { chapterName: 'Geometry', topicTitle: 'Lines' }),
  day('2026-12-03', { blockType: 'buffer' }),
  day('2026-12-04', { blockType: 'assessment', examName: 'Unit Test' }),
];

const apply = (operations: PlanOperation[], nextOpenDate?: (after: Date) => Date | null) =>
  applyPlanOperations({
    days: PLAN,
    monthlyRows: [],
    operations,
    chapters: [{ id: 'a', name: 'Algebra' }, { id: 'g', name: 'Geometry' }],
    dateKeyOf: (d) => d.toISOString().slice(0, 10),
    nextOpenDate,
  });

describe('applyPlanOperations', () => {
  it('edits only the requested field and leaves the input untouched', () => {
    const result = apply([{ type: 'edit_day', date: '2026-12-01', homeWork: 'Ex 2' }]);
    expect(result.errors).toEqual([]);
    expect(result.changes).toEqual([{ date: '2026-12-01', label: 'Home-work', before: '', after: 'Ex 2' }]);
    expect(result.days[1].manuallyEdited).toBe(true);
    expect(PLAN[1].homeWork).toBeUndefined();
  });

  it('matches chapters case-insensitively, turns a free period into a lesson and rejects unknown chapters', () => {
    const ok = apply([{ type: 'edit_day', date: '2026-12-03', chapterName: 'geometry' }]);
    expect(ok.days[3]).toMatchObject({ blockType: 'teach', chapterId: 'g', chapterName: 'Geometry' });

    const bad = apply([{ type: 'edit_day', date: '2026-12-01', chapterName: 'Optics' }]);
    expect(bad.errors[0]).toContain('Optics');
  });

  it('refuses dates outside the plan and exam days', () => {
    expect(apply([{ type: 'edit_day', date: '2026-12-25', remarks: 'x' }]).errors[0]).toContain('no period');
    expect(apply([{ type: 'swap_days', fromDate: '2026-12-01', toDate: '2026-12-04' }]).errors[0]).toContain('exam');
  });

  it('swaps lesson content but keeps each date and its status', () => {
    const result = apply([{ type: 'swap_days', fromDate: '2026-11-30', toDate: '2026-12-02' }]);
    expect(result.days[0]).toMatchObject({ chapterName: 'Geometry', status: 'completed' });
    expect(result.days[2]).toMatchObject({ chapterName: 'Algebra', homeWork: 'Ex 1', status: 'pending' });
  });

  it('pushes lessons forward into the next free period', () => {
    const result = apply([{ type: 'postpone', fromDate: '2026-12-01', by: 1 }]);
    expect(result.errors).toEqual([]);
    expect(result.days[1].blockType).toBe('buffer');
    expect(result.days[2].topicTitle).toBe('Terms');
    expect(result.days[3]).toMatchObject({ blockType: 'teach', topicTitle: 'Lines' });
    expect(result.days[4]).toMatchObject({ blockType: 'assessment', examName: 'Unit Test' });
  });

  it('will not push further than the free periods allow, or move a finished lesson', () => {
    expect(apply([{ type: 'postpone', fromDate: '2026-12-01', by: 2 }]).errors[0]).toContain('only 1 free period');
    expect(apply([{ type: 'postpone', fromDate: '2026-11-30', by: 1 }]).errors[0]).toContain("can't be pushed");
  });

  it('says so when asked to push a free period', () => {
    expect(apply([{ type: 'postpone', fromDate: '2026-12-03', by: 1 }]).errors[0]).toContain('free period');
  });

  it('carries unfinished work to the next open date', () => {
    const result = apply(
      [{ type: 'set_status', date: '2026-12-01', status: 'partial' }],
      () => new Date('2026-12-07T00:00:00Z'),
    );
    expect(result.days).toHaveLength(6);
    expect(result.changes.map((c) => c.label)).toEqual(['Status', 'New period for unfinished work']);
  });

  it('edits a monthly row only for a chapter taught that month', () => {
    const ok = apply([{ type: 'monthly_row', monthKey: '2026-12', chapterName: 'Algebra', teachingMethod: 'Group work' }]);
    expect(ok.monthlyRows).toHaveLength(1);
    expect(ok.changes[0].after).toBe('Group work');

    const bad = apply([{ type: 'monthly_row', monthKey: '2027-01', chapterName: 'Algebra', classWork: 'x' }]);
    expect(bad.errors[0]).toContain('not scheduled');
  });

  it('reports no changes when the plan already says that', () => {
    expect(apply([{ type: 'set_status', date: '2026-11-30', status: 'completed' }]).changes).toEqual([]);
  });

  it('does not accept exam blocks or unknown operations from the model', () => {
    expect(planOperationSchema.safeParse({ type: 'edit_day', date: '2026-12-01', blockType: 'assessment' }).success).toBe(false);
    expect(planOperationSchema.safeParse({ type: 'delete_plan' }).success).toBe(false);
  });
});
