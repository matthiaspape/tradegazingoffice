export const statusText = { PLANNED: 'Geplant', IN_PROGRESS: 'In Arbeit', COMPLETED: 'Erledigt', DISCARDED: 'Verworfen' };
export const missionTypeText = { PRODUCT_DESIGN: 'Produktkonzept', DESIGN: 'Design & Identität', PROTOTYPE: 'Prototyp', DEVELOPMENT: 'Entwicklung', INTEGRATION: 'Integrationen', TESTING: 'Tests & Qualität', PLATFORM: 'Projektorganisation', RELEASE: 'Veröffentlichung' };
export const modelText = { 'gpt-6-astra': 'Astra', 'gpt-5.6-sol': 'Sol', 'gpt-5.6-terra': 'Terra', 'gpt-5.6-luna': 'Luna' };
export const effortText = { low: 'Light', medium: 'Medium', high: 'High' };
export class DeskError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DeskError('Ein JSON-Objekt ist erforderlich.');
  return value;
}
export function text(value, field, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || value.includes('\0')) throw new DeskError(`${field} ist ungültig (max. ${max} Zeichen).`);
  return value.trim();
}
export function choice(value, options, field) {
  if (typeof value !== 'string' || !Object.hasOwn(options, value)) throw new DeskError(`${field} ist ungültig.`);
  return value;
}
export function link(value) {
  const result = text(value, 'Link', 1000);
  if (!result) return '';
  let url;
  try { url = new URL(result); } catch { throw new DeskError('Bitte eine vollständige http- oder https-Adresse verwenden.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new DeskError('Bitte eine vollständige http- oder https-Adresse ohne Zugangsdaten verwenden.');
  return url.href;
}
export function tags(value) {
  if (!Array.isArray(value) || value.length > 12) throw new DeskError('Maximal 12 Tags sind möglich.');
  return [...new Set(value.map(v => text(v, 'Tag', 40)).filter(Boolean))];
}
export const fieldValidators = {
  title: v => text(v, 'Titel', 120, true), objective: v => text(v, 'Ziel', 300, true),
  briefing: v => text(v, 'Briefing', 4000), result_summary: v => text(v, 'Ergebnis', 4000),
  link_label: v => text(v, 'Link-Bezeichnung', 120), link_url: link,
  status: v => choice(v, statusText, 'Status'), mission_type: v => choice(v, missionTypeText, 'Missionstyp'), tags,
  recommended_model: v => choice(v, modelText, 'Modell'), recommended_effort: v => choice(v, effortText, 'Effort'),
};
export function validateFields(input, allowed = Object.keys(fieldValidators)) {
  object(input);
  for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new DeskError(`Unbekanntes Feld: ${key}`);
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, fieldValidators[key](value)]));
}
