import { statusText, missionTypeText, modelText, effortText } from './contract.mjs';
import { assessmentSchema } from './execution-policy.mjs';
import { contextTools } from './context-tools.mjs';
import { bugTools } from './bug-tools.mjs';
const string = (maxLength, minLength = 0) => ({ type: 'string', minLength, maxLength });
const enumOf = obj => ({ type: 'string', enum: Object.keys(obj) });
const identity = { mission_id: string(160, 1) };
const fields = {
  title: string(120, 1), objective: string(300, 1), briefing: string(4000),
  mission_type: enumOf(missionTypeText), tags: { type: 'array', items: string(40, 1), maxItems: 12 },
  recommended_model: enumOf(modelText), recommended_effort: enumOf(effortText),
};
const resultFields = { result_summary: string(4000), link_label: string(120), link_url: string(1000) };
const executionFields = { execution_assessment: assessmentSchema, recommendation_reason: { ...string(1000), description: 'Zusätzliche Begründung; bei abweichender manueller Modellwahl oder Profiländerung ohne Entscheidungsbaum erforderlich.' } };
function tool(name, title, description, properties, required, readOnlyHint, idempotentHint = readOnlyHint) {
  return { name, title, description, inputSchema: { type: 'object', properties, required, additionalProperties: false }, annotations: { readOnlyHint, destructiveHint: false, idempotentHint, openWorldHint: false } };
}
export const missionTools = [
  tool('recommend_mission_profile', 'Modell empfehlen', 'Wendet den Tradegazing Office-Entscheidungsbaum an, ohne Daten zu ändern. Modellwahl und Denkstufe werden getrennt bewertet. Liefert Profil, Begründung und Regelversion.', { execution_assessment: assessmentSchema }, ['execution_assessment'], true),
  tool('list_missions', 'Missionen auflisten', 'Listet Tradegazing Office-Missionen nach Status, Typ und Tag. Mit next_offset weitere Seiten lesen.', { status: enumOf(statusText), mission_type: enumOf(missionTypeText), tag: string(40, 1), limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer', minimum: 0 } }, [], true),
  tool('get_mission', 'Mission lesen', 'Liest eine Tradegazing Office-Mission mit Versionsnummer und chronologischem Logbuch.', identity, ['mission_id'], true),
  tool('create_mission', 'Mission anlegen', 'Legt eine geplante Tradegazing Office-Mission an. execution_assessment ist Pflicht: erst den Arbeitsinhalt nach dem Entscheidungsbaum einordnen. Das Profil wird daraus berechnet und begründet protokolliert. Manuelle Abweichungen brauchen Modell, Denkstufe und recommendation_reason. Startet keine Arbeit.', { ...fields, ...executionFields }, ['title', 'objective', 'execution_assessment'], false),
  tool('update_mission', 'Mission aktualisieren', 'Ändert die angegebenen Felder und protokolliert die Änderung. expected_version aus get_mission schützt vor dem Überschreiben neuerer Änderungen. Optional mit execution_assessment das Profil neu bewerten; manuelle Profiländerungen brauchen recommendation_reason. Keine Löschung.', { ...identity, ...fields, ...resultFields, ...executionFields, status: enumOf(statusText), expected_version: { type: 'integer', minimum: 1 } }, ['mission_id'], false, false),
  tool('add_mission_log', 'Logbuch ergänzen', 'Ergänzt einen unveränderlichen Zwischenstand mit optionalem Weblink im Missionslogbuch.', { ...identity, body: string(3000, 1), link_label: string(120), link_url: string(1000) }, ['mission_id', 'body'], false),
];
export const deskTools = [...missionTools, ...contextTools, ...bugTools];
