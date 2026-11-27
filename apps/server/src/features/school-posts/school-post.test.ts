import { describe, it, expect } from 'vitest';
import { isPostForClass } from './school-post.service';
import { createSchoolPostSchema } from './school-post.validation';

describe('who a school post is for', () => {
  it('reaches every class when no class is listed', () => {
    expect(isPostForClass({ classes: [] }, '6', 'A')).toBe(true);
  });

  it('reaches only the listed class and section', () => {
    const post = { classes: [{ class: '6', section: 'A' }] };
    expect(isPostForClass(post, '6', 'A')).toBe(true);
    expect(isPostForClass(post, '6', 'B')).toBe(false);
    expect(isPostForClass(post, '7', 'A')).toBe(false);
  });

  it('matches Roman and digit class names, ignoring section case', () => {
    expect(isPostForClass({ classes: [{ class: 'IX', section: 'a' }] }, '9', 'A')).toBe(true);
  });
});

describe('school post form', () => {
  const homework = {
    kind: 'homework',
    title: 'Exercise 4.2',
    subject: 'Maths',
    dueDate: '2026-12-01',
    classes: JSON.stringify([{ class: '6', section: 'A' }]),
  };

  it('reads the class list sent as JSON', () => {
    expect(createSchoolPostSchema.parse(homework).classes).toEqual([{ class: '6', section: 'A' }]);
  });

  it('requires a class, subject and due date for homework', () => {
    const result = createSchoolPostSchema.safeParse({ kind: 'homework', title: 'Exercise 4.2' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(['classes', 'dueDate', 'subject']);
  });

  it('requires a type and date for an activity, and rejects unreadable classes', () => {
    expect(createSchoolPostSchema.safeParse({ kind: 'activity', title: 'Sports day' }).success).toBe(false);
    expect(createSchoolPostSchema.safeParse({ kind: 'news', title: 'Winter timings', classes: '{oops' }).success).toBe(false);
  });

  it('allows school-wide news with only a title', () => {
    expect(createSchoolPostSchema.parse({ kind: 'news', title: 'Winter timings' }).classes).toEqual([]);
  });
});
