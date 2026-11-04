import { DeskError } from './contract.mjs';

export const LEGAL_TAG = 'LEGAL-LICENSE';
export const rightsStatuses = {
  'RIGHTS-OPEN': 'Prüfung offen',
  'RIGHTS-EVIDENCED': 'Für benannten Einsatz belegt',
  'RIGHTS-BLOCKED': 'Nicht verwenden',
};
export const legalKnowledgeStatuses = { PROPOSED: 'Ungeprüfter Eintrag', CONFIRMED: 'Dokumentierter Stand', OPEN: 'Klärungsfrage', SUPERSEDED: 'Historisch' };
export const legalTags = tags => [...new Set(tags.map(tag => tag.toUpperCase() === LEGAL_TAG || Object.hasOwn(rightsStatuses, tag.toUpperCase()) ? tag.toUpperCase() : tag))];
export const isLegal = entry => entry.tags.some(tag => tag.toUpperCase() === LEGAL_TAG);
export const rightsStatus = entry => legalTags(entry.tags).find(tag => Object.hasOwn(rightsStatuses, tag)) || 'RIGHTS-OPEN';
export const legalTemplate = `Gegenstand / Dateien / Version:
Urheber / Anbieter / Originalquelle:
Bezugs- oder Erzeugungsdatum:
Einsatz: Office-Anwendung, Desk, Buildwerkzeug, Konzept oder Marketing; Plattformen / Märkte:
Lizenz / Vertragsfassung / Tarif / Laufzeit:
Belege: Lizenztext, Bedingungen, Archivpfad und ggf. Prüfsumme; private Beleg-ID:
Rechte: kommerziell / Bearbeitung / Einbettung / Weitergabe; Einschränkungen:
Credits / Notice-Pflichten / Einbauort:
KI / Ableitungen: Werkzeug, Modell, Prompt, Eingangsquellen und Bearbeitungen:
Offene Fragen / nächste Aktion / verantwortlich:
Prüfung: Datum, Person, Umfang und Begründung; erneut prüfen bei:
`;

export function validateLegal(entry, previous) {
  if (previous && isLegal(previous) && !isLegal(entry)) throw new DeskError('Registereinträge behalten das Tag LEGAL-LICENSE. Nicht mehr gültige Einträge als überholt markieren.');
  if (!isLegal(entry)) return;
  const states = entry.tags.filter(tag => Object.hasOwn(rightsStatuses, tag));
  if (states.length !== 1) throw new DeskError('Legal-Einträge brauchen genau einen Rechteprüfstatus: RIGHTS-OPEN, RIGHTS-EVIDENCED oder RIGHTS-BLOCKED.');
  if (!entry.content.trim()) throw new DeskError('Bitte Einsatz, Lizenznachweise und offene Fragen im Legal-Eintrag beschreiben.');
  if (states[0] === 'RIGHTS-EVIDENCED' && entry.status !== 'SUPERSEDED') {
    if (entry.status !== 'CONFIRMED' || !entry.confirmation_note || !entry.sources.some(s => ['DOCUMENT', 'WEB'].includes(s.type))) throw new DeskError('Belegte Nutzungsrechte benötigen einen bestätigten Prüfstand, eine Begründung und eine Dokument- oder Webquelle zum benannten Einsatz.');
  }
}
