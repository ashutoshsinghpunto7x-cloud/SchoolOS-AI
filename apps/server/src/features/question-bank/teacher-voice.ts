import { classNameKey } from '../../lib/class-name';
import type { PageFigure } from '@schoolos/types';

/**
 * Shared "sound like a real teacher, not an AI" style guide, injected into every question-writing
 * prompt (extraction/structuring, synthesis, worksheet authoring). Centralized here so the three
 * prompt builders (question-extraction.service.ts, worksheet-generator.service.ts) stay in sync
 * instead of drifting — a wording rule fixed in one place should never need fixing three times.
 *
 * This is a pure prompt-text concern: no schema/DB changes, no new AI calls. See
 * [[project_question_bank_delete_and_chapter_split]] and the "Peter Pan" spec this was built from.
 */

export type LanguageComplexity = 'auto' | 'simple' | 'standard' | 'advanced';

type GradeBand = 'foundational' | 'primary' | 'middle' | 'secondary' | 'senior';

const FOUNDATIONAL_NAMES = new Set(['NURSERY', 'LKG', 'UKG', 'PRE-NURSERY', 'PLAYGROUP', 'MONTESSORI', 'KG']);

/** Maps a class value (any spelling — "3", "III", "Nursery", …) to a coarse grade band that
 * governs vocabulary and question complexity. Numeral parsing reuses classNameKey so "IX" and "9"
 * land in the same band without duplicating the Roman-numeral table here. */
function gradeBand(cls: string): GradeBand {
  const key = classNameKey(cls);
  if (FOUNDATIONAL_NAMES.has(key)) return 'foundational';
  const num = Number(key);
  if (Number.isNaN(num)) return 'primary'; // unrecognized class name — assume mid-range rather than either extreme
  if (num <= 2) return 'foundational';
  if (num <= 5) return 'primary';
  if (num <= 8) return 'middle';
  if (num <= 10) return 'secondary';
  return 'senior';
}

const BAND_GUIDANCE: Record<GradeBand, string> = {
  foundational: `This is for a very young child (Nursery-2). Use only the simplest words a 5-7 year old already knows. One short sentence per question, one fact per question. Stick almost entirely to "Who...?", "What...?", "Where...?", "Name...", fill-in-the-blank, and True/False. Do not use "why" or "how" unless the answer is a single obvious, concrete fact stated directly on the page. Never use "explain", "describe in detail", "discuss", or any multi-part question.`,
  primary: `This is for a young child (Class 3-5). Use short, direct sentences and everyday words. "Why" and "How" questions are fine only when the answer is a concrete fact or feeling stated or clearly shown in the content (e.g. "Why did Wendy not visit the lagoon at night?"), never a question that asks the student to infer something the text doesn't say outright. Avoid "infer", "analyze", "evaluate", "discuss the implications", "elaborate", or any word a Class 3-5 student wouldn't use themselves.`,
  middle: `This is for a middle-school student (Class 6-8). Plain, natural sentences are still the goal — this is a school worksheet, not an essay prompt. Reasoning questions ("Why...", "How...", "Give one reason...") are fine when grounded in the chapter. Light comprehension/application language ("Give an example of...", "What happens when...") is fine. Still avoid stiff, over-formal AI phrasing like "analyze the significance of" or "what can be inferred about".`,
  secondary: `This is for a Class 9-10 student. Standard exam-register language is fine (short answer, HOTS, application-based), matching how a CBSE/state-board paper is actually worded — but keep it as a teacher would phrase it on an exam, not as generic AI prose. Prefer "Explain why...", "Give reasons for...", "What is the difference between...", "How would you...", over hedgy analytical phrasing.`,
  senior: `This is for a Class 11-12 student. Full exam-level vocabulary and higher-order questions (analysis, evaluation, application) are appropriate for this grade and subject. Still write the way a teacher actually phrases a real exam question, not the way a generic AI assistant phrases a discussion prompt.`,
};

const COMPLEXITY_OVERRIDE_GUIDANCE: Record<Exclude<LanguageComplexity, 'auto'>, string> = {
  simple: `\n\nThe teacher has explicitly asked for SIMPLE language regardless of the usual grade level — use short sentences and everyday words even if this class would normally support more advanced phrasing.`,
  standard: `\n\nThe teacher has explicitly asked for STANDARD language — normal grade-appropriate wording, neither simplified down nor stretched into advanced/HOTS phrasing.`,
  advanced: `\n\nThe teacher has explicitly asked for ADVANCED/HOTS-style language — push toward higher-order, analytical phrasing appropriate for a stronger student in this class, while still sounding like a real exam question.`,
};

/** Builds the grade-appropriate language directive for a prompt. `override` lets a teacher
 * explicitly dial simplicity up/down for this generation run instead of relying purely on the
 * class number (e.g. simplified worksheets for a weaker section, or stretch questions for a
 * gifted batch); 'auto' (the default) infers purely from the class. */
export function languageStyleGuide(cls: string, override: LanguageComplexity = 'auto'): string {
  const band = gradeBand(cls);
  const base = BAND_GUIDANCE[band];
  const overrideText = override === 'auto' ? '' : COMPLEXITY_OVERRIDE_GUIDANCE[override];
  return `${base}${overrideText}`;
}

/** Sentence-starter/phrasing rules shared by every question-writing prompt — the "sound like a
 * teacher's notebook, not an AI" core of the whole feature. */
export const TEACHER_VOICE_RULES = `Write every question the way a real school teacher would write it in a notebook or printed worksheet — plain, direct, and natural. Avoid stiff, generic AI phrasing such as "What is the main idea of...", "Based on the passage...", "According to the text...", "What can we learn from...", "What can be inferred about...", "Explain the significance of...", "How does the author...", or "What does this tell us about...", unless that exact register is genuinely how a teacher would phrase it for this grade and subject.

Prefer natural, familiar question forms instead: Who...? What...? Where...? When...? Why...? How...? Name... / Fill in the blank. / Choose the correct answer. / Write True or False. / Match the following. / Complete the sentence. / Write one word. / Write two/three sentences.

Every question must be answerable directly from the given content — do not add outside facts or general knowledge unless the instructions explicitly ask for extra/general questions. Do not make every question a comprehension or inference question — mix in simple recall, vocabulary, and observation questions too, appropriate to the grade. Never write two questions in the same batch that test the same fact or near-duplicate wording — cover different parts of the content instead.`;

/** Whether/how a batch of questions may reference a picture — conditional on `figures` actually
 * being available for this call, never a blanket allow. Keeps "never invent an image" true by
 * construction: the model can only ever point at a figureId it was explicitly handed. */
export function imageAvailabilityInstruction(figures: PageFigure[], includeImages: boolean): string {
  if (!includeImages || figures.length === 0) {
    return 'This system cannot attach an image to a question right now, so never write a question that depends on looking at a picture/diagram/figure (e.g. "Look at the picture and...") — write only questions answerable from text alone.';
  }

  const list = figures.map((f) => `- "${f.figureId}" (${f.figureType}${f.caption ? `, captioned "${f.caption}"` : ''}): ${f.description}`).join('\n');
  return `The following real images were detected on this page and are available for picture-based questions:
${list}

If — and only if — one of these images genuinely suits a good picture-based question (e.g. "Look at the picture and answer" / "Name the animals in the picture"), write it as one of your questions and set "imageFigureId" to that exact figure id string above (copy it exactly, never invent or alter one). Do not force a picture-based question if none of the images genuinely fit — most questions in this batch should still be plain text questions from the content, as usual. Never set "imageFigureId" to anything other than one of the exact ids listed above.

If a picture-based question would genuinely help but none of the listed images are a good fit for it, you may instead write the question with "imageRequired": true and an "imagePrompt" describing what a suitable image should show — but only do this occasionally, not for every question, and never set both "imageFigureId" and "imageRequired" on the same question.`;
}

/** Same contract as imageAvailabilityInstruction, but for the one-shot vision extraction path
 * (buildDirectExtractionPrompt) where the figures aren't known ahead of time — this same call is
 * what detects them. The model must find and describe its own figures (self-assigning a
 * scratch-work id) and can only reference one of those it just listed, never invent one; the
 * caller (parseDirectExtraction) remaps whatever id the model chose to a server-issued stable
 * figureId before anything is persisted, so "never invent an image" still holds by construction. */
export function imageAvailabilityInstructionSelfDetect(detectImages: boolean): string {
  if (!detectImages) {
    return 'This system cannot attach an image to a question right now, so never write a question that depends on looking at a picture/diagram/figure (e.g. "Look at the picture and...") — write only questions answerable from text alone. Do not return a "figures" field.';
  }

  return `As you read this page, also identify any meaningful illustrations, diagrams, charts, maps, or photos on it — not small decorative icons/borders. Return each one you find in a "figures" array, each object shaped:
- "figureId": a short id you invent for this figure, unique within this response (e.g. "fig1", "fig2")
- "boundingBox": {"x", "y", "width", "height"} — the image's position as fractions (0.0-1.0) of the full page's width/height, from the top-left corner. Estimate carefully, don't guess wildly.
- "figureType": one of "decorative", "content_supporting", "diagram", "chart_table", "map", "illustration"
- "caption": the printed caption/label near the image, if any, else omit
- "description": a short, factual description of what the image visually shows — this is the only record of the image's content a later step will have, so be specific
- "usableForQuestion": true if clear/substantial enough to build a question around, false for something too small, blurry, or purely decorative

If the page has no meaningful images, return an empty "figures" array — never invent one that isn't visibly present.

If — and only if — one of the figures you found genuinely suits a good picture-based question (e.g. "Look at the picture and...", "Name the animals in the picture"), write it as one of your questions and set "imageFigureId" to that figure's exact "figureId" you invented above (copy it exactly). Do not force a picture-based question if none of the images genuinely fit — most questions should still be plain text questions from the content. Never set "imageFigureId" to anything other than one of the exact ids you listed in "figures".

If a picture-based question would genuinely help but none of the found images are a good fit, you may instead write the question with "imageRequired": true and an "imagePrompt" describing what a suitable image should show — but only occasionally, never both "imageFigureId" and "imageRequired" on the same question.`;
}

/** Appended once per prompt as a final self-check instruction (spec section 18) — asks the model
 * to silently re-check its own output rather than adding a separate verification pass/call. */
export const SELF_CHECK_INSTRUCTION = `Before returning your answer, silently check every question against this checklist and rewrite anything that fails it:
1. Is the language and difficulty genuinely appropriate for this grade?
2. Does it sound like something a real teacher would write, not an AI assistant?
3. Is the answer clearly supported by the given content?
4. Is it meaningfully different from the other questions in this batch (not testing the same fact)?`;
