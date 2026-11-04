export function evidenceUrl(value: string) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : '#'; } catch { return '#'; }
}
// No remote repository has been configured. Keep document references as text.
export function projectDocumentUrl(_value: string): string | null { return null; }
