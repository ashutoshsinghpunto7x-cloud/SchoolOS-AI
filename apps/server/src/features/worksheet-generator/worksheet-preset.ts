import { QuestionType, QuestionDifficulty, BloomsLevel } from '../question-bank/question.model';
import { WorksheetType } from './worksheet.model';

export interface WorksheetPreset {
  label: string;
  /** Difficulties this worksheet type draws from — empty means "any". */
  difficulties: QuestionDifficulty[];
  /** Question types this worksheet type draws from — empty means "any". */
  questionTypes: QuestionType[];
  /** Bloom's levels this worksheet type draws from — empty means "any". */
  bloomsLevels: BloomsLevel[];
  /** Guidance folded into the AI-authoring fallback prompt when the bank falls short. */
  authoringGuidance: string;
}

export const WORKSHEET_PRESETS: Record<WorksheetType, WorksheetPreset> = {
  practice: {
    label: 'Practice Worksheet',
    difficulties: [],
    questionTypes: [],
    bloomsLevels: [],
    authoringGuidance: 'a balanced mix of easy, medium, and hard practice questions covering the core content',
  },
  homework: {
    label: 'Homework',
    difficulties: ['easy', 'medium'],
    questionTypes: ['short', 'very_short', 'fill_blank'],
    bloomsLevels: [],
    authoringGuidance: 'short, quick-to-answer questions suitable for independent homework practice',
  },
  revision: {
    label: 'Revision Sheet',
    difficulties: [],
    questionTypes: [],
    bloomsLevels: [],
    authoringGuidance: 'a spread of questions revisiting the key ideas across these chapters, mixed difficulty',
  },
  hots: {
    label: 'HOTS Questions',
    difficulties: ['medium', 'hard'],
    questionTypes: ['hots', 'case_study'],
    bloomsLevels: ['analyze', 'evaluate', 'create'],
    authoringGuidance: 'higher-order-thinking questions that require analysis, evaluation, or application beyond rote recall',
  },
  olympiad: {
    label: 'Olympiad Questions',
    difficulties: ['hard'],
    questionTypes: ['hots', 'case_study', 'assertion_reason'],
    bloomsLevels: ['analyze', 'evaluate', 'create'],
    authoringGuidance: 'challenging, olympiad-caliber enrichment questions that go beyond the standard textbook level',
  },
  remedial: {
    label: 'Remedial Worksheet',
    difficulties: ['easy'],
    questionTypes: ['very_short', 'fill_blank', 'mcq'],
    bloomsLevels: ['remember', 'understand'],
    authoringGuidance: 'simple, foundational questions for students who need extra reinforcement of the basics',
  },
};
