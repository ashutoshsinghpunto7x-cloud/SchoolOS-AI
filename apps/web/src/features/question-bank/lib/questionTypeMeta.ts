import type { QuestionType, QuestionDifficulty, BloomsLevel } from '@schoolos/types';

export const QUESTION_TYPES: QuestionType[] = ['mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study'];
export const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
export const BLOOMS_LEVELS: BloomsLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

export function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Free-text answer types where a single "correct answer" field is worth showing/editing —
// mcq gets its own options+answer picker (OptionsEditor) instead, and the long-form free-response
// types (very_short/short/long/hots/case_study) are graded by the teacher reading the answer, not
// matched against a stored string, so a correct-answer field there wouldn't mean anything.
const FREE_TEXT_ANSWER_TYPES: QuestionType[] = ['fill_blank', 'true_false', 'assertion_reason'];

export function needsCorrectAnswerField(questionType: QuestionType): boolean {
  return FREE_TEXT_ANSWER_TYPES.includes(questionType);
}
