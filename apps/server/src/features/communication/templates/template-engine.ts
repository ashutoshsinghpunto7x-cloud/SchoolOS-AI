/**
 * Renders `{{placeholder}}` tokens in a template body against a flat data map.
 * Unknown placeholders are left blank rather than throwing, so a template can
 * be edited to add/remove placeholders without a code change breaking sends.
 */
export function renderTemplate(body: string, data: Record<string, string | number | undefined>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
