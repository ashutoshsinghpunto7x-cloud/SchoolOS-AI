/**
 * The AI extraction/synthesis prompts ask for plain option text, but the model frequently answers
 * with its own "a. "/"b) "/"(c) " label already baked into the string (e.g. `"a. England"`).
 * PaperDocument (web) always prepends its own `(a)`/`(b)`/… label when printing an MCQ's options,
 * so unstripped input doubles up on the printed paper — "(a) a. England" instead of "(a) England".
 * Stripping here (at write time) keeps new saves clean; callers that display/print
 * already-saved data should also strip defensively (see the web-side equivalent in
 * apps/web/.../lib/optionText.ts) since this doesn't retroactively fix existing rows.
 */
const OPTION_LABEL_PATTERN = /^\s*(?:\(([a-dA-D])\)|([a-dA-D])[.):])\s+/;

export function stripOptionLabel(option: string): string {
  return option.replace(OPTION_LABEL_PATTERN, '').trim();
}

export function normalizeOptions(options?: string[] | null): string[] | undefined {
  if (!Array.isArray(options)) return undefined;
  return options.map(stripOptionLabel);
}
