/**
 * Strips a letter label ("a. ", "(b)", "c)", …) the AI sometimes bakes into an option's own text.
 * PaperDocument always prepends its own (a)/(b)/(c)/(d) label when printing an MCQ's options, so
 * unstripped text prints doubled — "(a) a. England" instead of "(a) England". New saves are
 * cleaned server-side (see apps/server/.../option-text.ts), but this covers options saved before
 * that existed — apply wherever option text is rendered, not just on the printed paper.
 */
const OPTION_LABEL_PATTERN = /^\s*(?:\(([a-dA-D])\)|([a-dA-D])[.):])\s+/;

export function stripOptionLabel(option: string): string {
  return option.replace(OPTION_LABEL_PATTERN, '').trim();
}
