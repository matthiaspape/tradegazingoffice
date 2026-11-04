import { DeskError, object, text, choice, tags, link } from './contract.mjs';
import { legalTags } from './legal-contract.mjs';

export const contextKinds = { VISION: 'Projektvision', DECISION: 'Entscheidung', CONSTRAINT: 'Rahmenbedingung', TERM: 'Begriff', REFERENCE: 'Dokumentverweis', QUESTION: 'Offene Frage' };
export const contextTopics = { PROJECT: 'Projekt', WORKFLOWS: 'Arbeitsabläufe', ACCOUNTING: 'Buchhaltung & Finanzen', TRADING: 'Trading & EAs', PLATFORM: 'Plattform & Bedienung', ART: 'Grafik', TECHNOLOGY: 'Architektur & Technik', BRAND: 'Name & Identität', INTEGRATION: 'Integrationen', PRODUCT: 'Produktumfang', ORGANIZATION: 'Zusammenarbeit' };
export const contextStatuses = { PROPOSED: 'Vorschlag', CONFIRMED: 'Bestätigt', OPEN: 'Offen', SUPERSEDED: 'Überholt' };
export const sourceTypes = { MISSION: 'Mission', DOCUMENT: 'Projektdatei', WEB: 'Webquelle', USER: 'Nutzervorgabe' };
export const bool = value => { if (typeof value !== 'boolean') throw new DeskError('Ja/Nein-Angabe erforderlich.'); return value; };
export function entryKey(value) {
  const key = text(value, 'Kennung', 80, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) throw new DeskError('Die Kennung darf Kleinbuchstaben, Ziffern und Bindestriche enthalten.');
  return key;
}
export function sources(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new DeskError('Bitte eine bis acht Quellen angeben.');
  return value.map(item => {
    object(item);
    for (const key of Object.keys(item)) if (!['type', 'ref', 'label'].includes(key)) throw new DeskError(`Unbekanntes Quellenfeld: ${key}`);
    const type = choice(item.type, sourceTypes, 'Quellenart');
    let ref = text(item.ref, 'Quellenverweis', 1000, true);
    const label = text(item.label, 'Quellenbezeichnung', 160, true);
    if (type === 'WEB') ref = link(ref);
    if (type === 'DOCUMENT' && (!/^(?:(?:TradegazingOfficeDesk|docs|design|assets)\/[\p{L}\p{N}_. /-]+|AGENTS\.md|README\.md)$/u.test(ref) || ref.split('/').some(part => !part.trim() || part === '.' || part === '..'))) throw new DeskError('Projektdateien relativ angeben, z. B. docs/FleetControlDeskKonzept.md.');
    return { type, ref, label };
  }).filter((source, index, all) => all.findIndex(other => other.type === source.type && other.ref === source.ref) === index);
}
const validators = {
  key: entryKey, title: v => text(v, 'Titel', 120, true), summary: v => text(v, 'Kurzfassung', 500, true), content: v => text(v, 'Erläuterung', 4000),
  kind: v => choice(v, contextKinds, 'Wissensart'), topic: v => choice(v, contextTopics, 'Thema'), status: v => choice(v, contextStatuses, 'Wissensstatus'),
  tags: v => legalTags(tags(v)), sources, confirmation_note: v => text(v, 'Grundlage der Bestätigung', 1000), is_core: bool,
  superseded_by: v => v === null ? null : text(v, 'Nachfolger', 160, true),
};
export function contextFields(input, creating = false) {
  object(input);
  for (const key of Object.keys(input)) if (!Object.hasOwn(validators, key) || (!creating && key === 'key')) throw new DeskError(`Unbekanntes oder unveränderliches Wissensfeld: ${key}`);
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, validators[key](value)]));
}
export function pageBounds(limit = 30, offset = 0, maximum = 100) {
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum || !Number.isInteger(offset) || offset < 0) throw new DeskError('Ungültige Seitengröße oder Position.');
  return { limit, offset };
}
export const fold = text => text.normalize('NFKC').toLocaleLowerCase('de-DE');
