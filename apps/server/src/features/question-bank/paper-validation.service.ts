import { PaperGenerationConfig, PaperValidationResult } from '@schoolos/types';
import { IQuestion } from './question.model';
import { ISyllabusChapter } from './chapter.model';

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const paperValidationService = {
  /** Runs the coverage/duplicate/distribution/weightage/Bloom's/time checks over an assembled paper. */
  validate(
    config: PaperGenerationConfig,
    chapters: ISyllabusChapter[],
    selected: IQuestion[],
  ): PaperValidationResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // ── Coverage: chapters requested but zero questions selected ──────────────
    const chapterIdsWithQuestions = new Set(selected.map((q) => q.chapterId));
    const uncovered = chapters.filter((c) => !chapterIdsWithQuestions.has(String(c._id)));
    for (const c of uncovered) {
      warnings.push(`"${c.chapterName}" has no questions in this paper.`);
    }
    const coveragePercent = chapters.length > 0
      ? Math.round(((chapters.length - uncovered.length) / chapters.length) * 100)
      : 100;

    // ── Broken MCQs: fewer than 2 options means nothing prints for the student to choose from.
    // New saves are blocked by question-bank.validation's requireMcqOptions, but this paper may
    // pull in mcq questions saved before that check existed — surface it so a teacher catches a
    // blank-choices question here rather than on the printed paper.
    const brokenMcqs = selected.filter((q) => q.questionType === 'mcq' && (q.options?.filter((o) => o.trim()).length ?? 0) < 2);
    for (const q of brokenMcqs) {
      warnings.push(`"${q.questionText.slice(0, 50)}…" is an MCQ with fewer than 2 answer options — fix it in the Question Bank before printing.`);
    }

    // ── Duplicate detection: near-identical question text among selected ──────
    const seen = new Map<string, string>();
    for (const q of selected) {
      const key = normalize(q.questionText).slice(0, 80);
      if (seen.has(key)) {
        warnings.push(`Possible duplicate: "${q.questionText.slice(0, 50)}…" appears more than once.`);
      } else {
        seen.set(key, q.questionText);
      }
    }

    // ── Marks distribution: requested count per marks value vs. actual ────────
    const actualByMarks = new Map<number, number>();
    for (const q of selected) actualByMarks.set(q.marks, (actualByMarks.get(q.marks) ?? 0) + 1);
    for (const entry of config.marksBreakdown) {
      const actual = actualByMarks.get(entry.marks) ?? 0;
      if (actual < entry.count) {
        warnings.push(`Only ${actual}/${entry.count} questions found worth ${entry.marks} mark(s) each.`);
      }
    }

    // ── Difficulty balance ──────────────────────────────────────────────────────
    const actualDifficulty = { easy: 0, medium: 0, hard: 0 };
    for (const q of selected) actualDifficulty[q.difficulty] += 1;
    const requestedTotal = config.difficultyMix.easy + config.difficultyMix.medium + config.difficultyMix.hard;
    if (requestedTotal > 0) {
      (['easy', 'medium', 'hard'] as const).forEach((level) => {
        const requested = config.difficultyMix[level];
        const actual = actualDifficulty[level];
        if (requested > 0 && actual < requested) {
          warnings.push(`Only ${actual}/${requested} ${level} questions found.`);
        }
      });
      const easyShare = actualDifficulty.easy / Math.max(1, selected.length);
      if (easyShare > 0.7) {
        suggestions.push('This paper is heavily weighted toward easy questions — consider adding more medium/hard questions.');
      }
    }

    // ── Bloom's taxonomy balance ────────────────────────────────────────────────
    const higherOrder = selected.filter((q) => ['analyze', 'evaluate', 'create'].includes(q.bloomsLevel)).length;
    if (selected.length > 0 && higherOrder === 0) {
      suggestions.push('No higher-order thinking (analyze/evaluate/create) questions included — consider adding at least one.');
    }

    // ── Chapter weightage: marks assembled per chapter vs. its share of topics ──
    const totalTopics = chapters.reduce((sum, c) => sum + Math.max(1, c.topics.length), 0);
    const marksByChapter = new Map<string, number>();
    for (const q of selected) marksByChapter.set(q.chapterId, (marksByChapter.get(q.chapterId) ?? 0) + q.marks);
    const totalAssembled = selected.reduce((sum, q) => sum + q.marks, 0);
    for (const c of chapters) {
      const expectedShare = Math.max(1, c.topics.length) / Math.max(1, totalTopics);
      const actualShare = totalAssembled > 0 ? (marksByChapter.get(String(c._id)) ?? 0) / totalAssembled : 0;
      if (expectedShare > 0.15 && actualShare < expectedShare * 0.4) {
        suggestions.push(`"${c.chapterName}" looks under-represented relative to its size — consider adding more marks here.`);
      }
    }

    // ── Estimated time vs. exam duration ────────────────────────────────────────
    const totalEstimatedTimeMinutes = selected.reduce((sum, q) => sum + q.estimatedTimeMinutes, 0);
    if (config.durationMinutes && totalEstimatedTimeMinutes > config.durationMinutes) {
      warnings.push(`Estimated solving time (${totalEstimatedTimeMinutes} min) exceeds the exam duration (${config.durationMinutes} min).`);
    }

    return { warnings, suggestions, coveragePercent, totalEstimatedTimeMinutes };
  },
};
