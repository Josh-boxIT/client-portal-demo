// ─── Client-side template rendering for Action → Ticket mapping ──────────────
// Pure module (no React) — used by ActionWizard to build a CreateTicketInput
// from an ActionDef's `ticket.summaryTemplate`/`descriptionTemplate` and the
// wizard's collected field values, and by the admin authoring UI to validate
// that template tokens reference real field ids.

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Replace every `{{fieldId}}` token (optional surrounding whitespace) with
 *  `String(values[fieldId] ?? '')`. Unknown tokens resolve to an empty string. */
export function renderTemplate(tpl: string, values: Record<string, unknown>): string {
  return tpl.replace(TOKEN_RE, (_match, fieldId: string) => String(values[fieldId] ?? ''));
}

/** Return the distinct field ids referenced by a template string, in first-seen order. */
export function collectTokens(tpl: string): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const match of tpl.matchAll(TOKEN_RE)) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
