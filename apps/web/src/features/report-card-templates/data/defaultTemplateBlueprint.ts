import type { TemplateSubjectRow, TemplateSkillSection, TemplateGradingKeyEntry } from '@schoolos/types';

/**
 * The school's standard report-card layout — subjects, co-scholastic skill sections, and grading
 * key exactly matching the printed First Term/Final Term card format. Loading this into a new
 * template means a principal never has to re-type ~20 subjects and ~15 skill rows from scratch
 * for every class/year; they can start from this and only adjust what differs (e.g. drop Abacus
 * for a senior class), then map exam slots and publish.
 */

const marksSubject = (name: string, order: number): TemplateSubjectRow => ({
  name, evaluationType: 'marks', order, unitTestMaxMarks: 20, mainExamMaxMarks: 80,
});

const gradeSubject = (name: string, order: number): TemplateSubjectRow => ({
  name, evaluationType: 'grade', order, unitTestMaxMarks: 0, mainExamMaxMarks: 0,
});

export const DEFAULT_TEMPLATE_SUBJECTS: TemplateSubjectRow[] = [
  marksSubject('English - Literature', 0),
  marksSubject('English - Language', 1),
  marksSubject('English - Reading', 2),
  marksSubject('English - Writing', 3),
  marksSubject('English - Dictation/Spelling', 4),
  marksSubject('Hindi - Literature', 5),
  marksSubject('Hindi - Language', 6),
  marksSubject('Hindi - Reading', 7),
  marksSubject('Hindi - Writing', 8),
  marksSubject('Hindi - Dictation/Spelling', 9),
  marksSubject('Mathematics', 10),
  marksSubject('Science/EVS', 11),
  marksSubject('Computer Education', 12),
  marksSubject('G.K.', 13),
  marksSubject('Abacus', 14),
  gradeSubject('Moral Science', 15),
  gradeSubject('Art/Craft', 16),
  gradeSubject('Music', 17),
  gradeSubject('Dance', 18),
  gradeSubject('P.T./Games', 19),
];

export const DEFAULT_TEMPLATE_SKILL_SECTIONS: TemplateSkillSection[] = [
  {
    name: 'English Language Skills',
    order: 0,
    rows: [
      { label: 'Applies listening skills', order: 0 },
      { label: 'Speaks in complete sentences', order: 1 },
      { label: 'Communicate ideas clearly', order: 2 },
      { label: 'Understands and follow instructions', order: 3 },
    ],
  },
  {
    name: 'Personal, Social and Work Habits',
    order: 1,
    rows: [
      { label: 'Punctual to school', order: 0 },
      { label: 'Regular to school', order: 1 },
      { label: 'Has a neat appearance', order: 2 },
      { label: 'Takes interest in class activities', order: 3 },
      { label: 'Follow instructions', order: 4 },
      { label: 'Listen attentively in class', order: 5 },
      { label: 'Is co-operative', order: 6 },
      { label: 'Finishes work on time', order: 7 },
      { label: 'Presents neat work', order: 8 },
      { label: 'Cares for personal and school property', order: 9 },
    ],
  },
];

export const DEFAULT_TEMPLATE_GRADING_KEY: TemplateGradingKeyEntry[] = [
  { label: 'A', description: 'Excellent', order: 0 },
  { label: 'B', description: 'Good', order: 1 },
  { label: 'C', description: 'Satisfactory', order: 2 },
  { label: 'D', description: 'Needs Improvement', order: 3 },
];
