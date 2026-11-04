import { rightsStatuses } from './legal-contract.mjs';
import { contextKinds, contextTopics, contextStatuses, sourceTypes } from './context-contract.mjs';
const str = (maxLength, minLength = 0) => ({ type: 'string', maxLength, minLength });
const enumOf = object => ({ type: 'string', enum: Object.keys(object) });
const fields = {
  title: str(120, 1), summary: { ...str(500, 1), description: 'Kurze eigenständige Aussage. Detaillierte Konzepte im Repository verlinken.' }, content: str(4000),
  kind: enumOf(contextKinds), topic: enumOf(contextTopics), status: enumOf(contextStatuses),
  tags: { type: 'array', maxItems: 12, items: str(40) }, is_core: { type: 'boolean', description: 'Nur für wenige bestätigte Grundlagen, die jeder neue Chat kennen muss.' },
  sources: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', properties: {
    type: enumOf(sourceTypes), ref: { ...str(1000, 1), description: 'MISSION: stabile ID; DOCUMENT: Repositorypfad (docs/, game/, assets/, TradegazingOfficeDesk/, AGENTS.md oder README.md); WEB: http(s)-URL; USER: konkrete Nutzeraussage mit Gespräch/Datum.' }, label: str(160, 1),
  }, required: ['type', 'ref', 'label'], additionalProperties: false } },
  confirmation_note: { ...str(1000), description: 'Bei CONFIRMED erforderlich. Tatsächliche Bestätigung oder überprüfbare Grundlage nennen; keine Freigabe erfinden. Bei inhaltlicher Änderung bestätigten Wissens ausdrücklich erneut mitgeben.' },
  change_reason: { ...str(1000, 1), description: 'Warum wird dieser Eintrag angelegt oder geändert?' },
};
const filters = { query: str(160), topic: enumOf(contextTopics), mission_id: str(160, 1) };
const limit = { type: 'integer', minimum: 1, maximum: 100 };
const offset = { type: 'integer', minimum: 0 };
function tool(name, title, description, properties, required, readOnlyHint) {
  return { name, title, description, inputSchema: { type: 'object', properties, required, additionalProperties: false }, annotations: { readOnlyHint, destructiveHint: false, idempotentHint: readOnlyHint, openWorldHint: false } };
}
export const contextTools = [
  tool('get_project_context', 'Projektkontext lesen', 'Einstieg für neue Chats: kompakter Projektüberblick plus relevantes Wissen. Bestätigtes, Vorschläge und offene Fragen getrennt; Überholtes ausgeschlossen. mission_id ergänzt Relevanz über Quellen und gemeinsame Tags. Liefert Kurzfassungen mit IDs, keine Volltexte; Quellen über get_context_entry prüfen. Bei truncated mit list_context_entries weiterblättern.', { ...filters, limit: { ...limit, maximum: 20 } }, [], true),
  tool('list_context_entries', 'Wissen suchen', 'Durchsucht Titel, Kurzfassungen, Erläuterungen, Tags und Quellen (alle Suchwörter). Standard CURRENT schließt Überholtes aus. mission_id filtert exakt verknüpfte Missionen. tag filtert exakt; LEGAL-LICENSE und legal_status für das Legal-Register. Mit next_offset weiterblättern. IDs aus der Antwort für get_context_entry verwenden.', { ...filters, tag: str(40, 1), legal_status: enumOf(rightsStatuses), kind: enumOf(contextKinds), status: { type: 'string', enum: ['CURRENT', 'ALL', ...Object.keys(contextStatuses)] }, is_core: { type: 'boolean' }, limit, offset }, [], true),
  tool('get_context_entry', 'Wissen mit Herkunft lesen', 'Liest vollständigen Eintrag, Quellen, Bestätigungsgrundlage und unveränderliche frühere Fassungen. Standard fünf neueste Revisionen, next_history_offset für ältere. Vor Änderungen immer lesen.', { entry_id: str(160, 1), history_limit: { ...limit, maximum: 20 }, history_offset: offset }, ['entry_id'], true),
  tool('create_context_entry', 'Wissen festhalten', 'Vorher nach vorhandenem Wissen suchen. Stabile eindeutige key verwenden. Standard PROPOSED; QUESTION beginnt OPEN. CONFIRMED nur mit belegter Bestätigungsgrundlage. Quellen und Begründung verpflichtend. Kein automatisches Übernehmen von Missionsergebnissen als Entscheidung.', { key: { ...str(80, 1), pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }, ...fields }, ['key', 'title', 'summary', 'kind', 'topic', 'sources', 'change_reason'], false),
  tool('update_context_entry', 'Wissen aktualisieren', 'Teilupdate mit zwingender expected_version und Begründung; speichert vollständige frühere Fassungen. Bei Konflikt neu lesen. SUPERSEDED entfernt den Eintrag aus dem aktuellen Kontext und ist endgültig; optional auf aktuell bestätigten Nachfolger verweisen. Keine Löschung.', { entry_id: str(160, 1), expected_version: { type: 'integer', minimum: 1 }, ...fields, superseded_by: { anyOf: [str(160, 1), { type: 'null' }] } }, ['entry_id', 'expected_version', 'change_reason'], false),
];
