import type { QuestionImageRef, ResolvedQuestionImage } from '@schoolos/types';
import { questionSourceRepository } from './question-source.repository';
import { readImage } from '../../lib/image-store';

/**
 * Resolves every distinct imageRef across a set of papers/worksheet questions into an actual
 * displayable payload (full page image as a data URI + the figure's fractional crop) — see
 * ResolvedQuestionImage. Deliberately recomputed on every read (paper/worksheet generate AND
 * getById) rather than persisted on the GeneratedPaper/Worksheet document itself: embedding
 * base64 images directly on that Mongo doc would reintroduce exactly the 16MB-per-document risk
 * GridFS was adopted to avoid (see lib/image-store.ts) — the doc keeps only the imageRef pointer,
 * and this walks GridFS fresh each time a paper/worksheet is actually viewed.
 *
 * Never throws on a missing/unreadable image (deleted source, race, corrupt id, wrong school) —
 * that imageRef is just left unresolved, which the frontend already treats as "no image" rather
 * than an error, and one bad reference shouldn't block rendering everything else on the page.
 */
export async function resolveQuestionImages(
  questions: { imageRef?: QuestionImageRef }[],
  schoolId: string,
): Promise<Record<string, ResolvedQuestionImage>> {
  const refs = questions
    .map((q) => q.imageRef)
    .filter((r): r is QuestionImageRef => !!r?.sourceId && !!r.figureId);
  if (refs.length === 0) return {};

  const uniqueSourceIds = [...new Set(refs.map((r) => r.sourceId))];
  const sources = await Promise.all(uniqueSourceIds.map((id) => questionSourceRepository.findById(id, schoolId)));
  const sourceById = new Map(sources.filter((s) => !!s).map((s) => [String(s!._id), s!]));

  const result: Record<string, ResolvedQuestionImage> = {};
  for (const ref of refs) {
    const key = `${ref.sourceId}:${ref.figureId}`;
    if (result[key]) continue;

    const source = sourceById.get(ref.sourceId);
    if (!source) continue;

    // A figure (and the page image it belongs to) can live at the source's top level
    // (single-image upload) or under one specific page (chapter capture) — check both.
    let figure = source.figures?.find((f) => f.figureId === ref.figureId);
    let fileId = source.pageImageFileId;
    if (!figure) {
      for (const page of source.pages ?? []) {
        const match = page.figures?.find((f) => f.figureId === ref.figureId);
        if (match) { figure = match; fileId = page.pageImageFileId; break; }
      }
    }
    if (!figure || !fileId) continue;

    const image = await readImage(fileId, schoolId);
    if (!image) continue;

    result[key] = {
      pageImageDataUri: `data:${image.contentType};base64,${image.buffer.toString('base64')}`,
      boundingBox: figure.boundingBox,
    };
  }
  return result;
}
