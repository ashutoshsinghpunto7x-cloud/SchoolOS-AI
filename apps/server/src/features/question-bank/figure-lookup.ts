import type { IQuestionSource } from './question-source.model';
import type { PageFigure } from '@schoolos/types';

/** A figure paired with the source it actually lives on — synthesis/authoring only ever sees the
 * figure's own fields (see teacher-voice.ts's imageAvailabilityInstruction), but the caller needs
 * this pairing afterward to fill in a chosen figureId's imageRef.sourceId (see synthesizeQuestions
 * and worksheet-generator.service.ts's buildAuthoringPrompt caller). */
export interface ChapterFigure {
  figure: PageFigure;
  sourceId: string;
}

/**
 * Flattens every usable figure across a set of uploads scoped to one chapter — a single-image
 * upload's top-level `figures`, and a chapter-capture's per-page `figures` — into one flat list,
 * each tagged with the sourceId a picked figureId must resolve back to (image-resolution.ts looks
 * the figure back up on that exact source when embedding the final picture). Only sources tagged
 * with this exact chapter name are considered, same scoping fillMarksGapsWithAi already uses for
 * this chapter's text context.
 */
export function collectChapterFigures(sources: IQuestionSource[], chapterName: string): ChapterFigure[] {
  const out: ChapterFigure[] = [];
  for (const source of sources) {
    if (source.chapterName !== chapterName) continue;
    const sourceId = String(source._id);
    for (const figure of source.figures ?? []) out.push({ figure, sourceId });
    for (const page of source.pages ?? []) {
      for (const figure of page.figures ?? []) out.push({ figure, sourceId });
    }
  }
  return out;
}
