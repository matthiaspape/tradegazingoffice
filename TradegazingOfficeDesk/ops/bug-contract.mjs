export const bugLevels = ['HOCH', 'MITTEL', 'NIEDRIG', 'UNBEKANNT'];
export const bugStatuses = ['NEU', 'EINGESCHAETZT', 'ZURUECKGESTELLT', 'EINGEPLANT', 'IN_ARBEIT', 'ERLEDIGT', 'DUPLIKAT', 'KEIN_FEHLER'];
export const bugDecisions = ['WEITER', 'EINGESCHRAENKT', 'BLOCKIERT', 'KONTEXT_BEENDET'];
export const bugEvidenceStates = ['VERDACHT', 'BEOBACHTET', 'REPRODUZIERT'];
export const bugComponents = ['Datenimport', 'Datenqualität', 'Suchsteuerung', 'Strategie/Signale', 'Backtest/MT5', 'Kennzahlen/Risiko', 'Registerimport', 'Desk/API', 'Infrastruktur'];
export const closedBugStatuses = ['ERLEDIGT', 'DUPLIKAT', 'KEIN_FEHLER'];
export const bugLabels = { HOCH:'Hoch', MITTEL:'Mittel', NIEDRIG:'Niedrig', UNBEKANNT:'Unbekannt', NEU:'Neu', EINGESCHAETZT:'Eingeschätzt', ZURUECKGESTELLT:'Zurückgestellt', EINGEPLANT:'Eingeplant', IN_ARBEIT:'In Arbeit', ERLEDIGT:'Erledigt', DUPLIKAT:'Duplikat', KEIN_FEHLER:'Kein Fehler', KONTEXT_BEENDET:'Kontext beendet', WEITER:'Fortsetzung möglich', EINGESCHRAENKT:'Mit Einschränkung', BLOCKIERT:'Lauf blockiert', VERDACHT:'Verdacht', BEOBACHTET:'Beobachtet', REPRODUZIERT:'Reproduziert' };

import { DeskError } from './contract.mjs';

export class BugError extends DeskError {
  constructor(message, status=400) { super(message); this.status=status; this.code=status===503?'BUG_BOARD_SCHEMA_MISSING':status===409?'BUG_CONFLICT':status===404?'BUG_NOT_FOUND':'BUG_INVALID'; }
}
export function bugText(value, name, max=3000, required=true) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()) || /\u0000/.test(value)) throw new BugError(`${name}: gültiger Text${required?' erforderlich':''}, maximal ${max} Zeichen.`);
  return value.trim();
}
function choice(value, values, name) {
  if (!values.includes(value)) throw new BugError(`${name}: ungültiger Wert.`);
  return value;
}
export function bugObject(value, name='Anfrage') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BugError(`${name}: Objekt erforderlich.`);
  return value;
}
export function bugKeys(value, keys) {
  bugObject(value);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new BugError(`Unbekanntes Feld: ${key}`);
}
export const bugFields = ['title','expected','actual','impact','severity','probability','risk','risk_reason','evidence_state','components','scope','owner','status','deferral_reason','resolution','duplicate_of'];
export function validateBug(value) {
  bugKeys(value,bugFields);
  const result={};
  for (const name of ['title','expected','actual','impact','risk_reason']) result[name]=bugText(value[name],name,name==='title'?160:3000);
  for (const name of ['severity','probability','risk']) result[name]=choice(value[name],bugLevels,name);
  result.evidence_state=choice(value.evidence_state,bugEvidenceStates,'Belegstatus');
  result.status=choice(value.status??'NEU',bugStatuses,'Status');
  if (!Array.isArray(value.components) || !value.components.length || value.components.length>15) throw new BugError('Mindestens eine betroffene oder vermutete Komponente erforderlich (maximal 15).');
  result.components=[...new Set(value.components.map(v=>{const name=bugText(v,'Komponente',80);return bugComponents.find(c=>c.toLocaleLowerCase('de')===name.toLocaleLowerCase('de'))||name;}))];
  for(const name of ['scope','owner','deferral_reason','resolution','duplicate_of']) result[name]=bugText(value[name],name,name==='owner'||name==='duplicate_of'?160:3000,false);
  if(result.status==='ZURUECKGESTELLT'&&!result.deferral_reason) throw new BugError('Zurückstellungsgrund erforderlich.');
  if(['ERLEDIGT','KEIN_FEHLER'].includes(result.status)&&!result.resolution) throw new BugError('Abschlussbeleg beziehungsweise Begründung erforderlich.');
  if(result.status==='DUPLIKAT'&&!result.duplicate_of) throw new BugError('Referenz auf den ursprünglichen Bug erforderlich.');
  if(result.status!=='DUPLIKAT'&&result.duplicate_of) throw new BugError('Duplikatreferenz nur mit Status DUPLIKAT.');
  return result;
}
export const occurrenceFields=['mission_id','run_id','stage','version','context','evidence_ref','evidence_state','decision','reason','blocked_step','no_workaround'];
export function validateOccurrence(value) {
  bugKeys(value,occurrenceFields);
  const result={};
  for(const name of ['mission_id','run_id','stage','version']) result[name]=bugText(value[name],name,200,false);
  result.context=bugText(value.context,'Kontext',3000);
  result.evidence_ref=bugText(value.evidence_ref,'Belegreferenz',1500);
  // References can be repository/log paths or http(s) URLs, never executable schemes.
  if(/^[a-z][a-z0-9+.-]*:/i.test(result.evidence_ref)&&!/^https?:\/\//i.test(result.evidence_ref)) throw new BugError('Belegreferenz: nur http(s) oder ein Quellenpfad.');
  result.decision=choice(value.decision,bugDecisions,'Laufentscheidung');
  result.evidence_state=choice(value.evidence_state,bugEvidenceStates,'Belegstatus dieses Vorkommens');
  result.reason=bugText(value.reason,'Begründung der Laufentscheidung',3000);
  for(const name of ['blocked_step','no_workaround'])result[name]=bugText(value[name],name,3000,false);
  if(result.decision==='BLOCKIERT'&&(!result.run_id||!result.stage)) throw new BugError('Eine Blockade benötigt den konkreten Lauf und die betroffene Stufe.');
  if(result.decision==='BLOCKIERT'&&(result.evidence_state==='VERDACHT'||!result.blocked_step||!result.no_workaround))throw new BugError('Eine Blockade benötigt einen beobachteten/reproduzierten Beleg, den blockierten Schritt und die Begründung, warum keine einfache Fortsetzung möglich ist.');
  return result;
}
