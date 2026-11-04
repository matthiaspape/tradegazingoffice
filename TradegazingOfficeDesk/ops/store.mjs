import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { databasePath } from './config.mjs';
import { DeskError, validateFields, text, link, object, choice, statusText, missionTypeText } from './contract.mjs';
import { resolveExecution } from './execution-policy.mjs';
import { modelText, effortText } from './contract.mjs';

export function openDatabase() {
  if (!existsSync(databasePath())) throw new DeskError('Der Desk ist noch nicht eingerichtet. Bitte einmal die Einrichtung ausführen.', 503);
  const db = new DatabaseSync(databasePath());
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (![1, 2].includes(db.prepare('PRAGMA user_version').get().user_version)) { db.close(); throw new DeskError('Unbekannte Datenbankversion.', 503); }
  return db;
}
export function withDatabase(fn, write = false) {
  const db = openDatabase();
  try {
    db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; } finally { db.close(); }
}
function present(row) {
  if (!row) throw new DeskError('Mission nicht gefunden.', 404);
  const { tags_json, ...mission } = row;
  return { ...mission, tags: JSON.parse(tags_json) };
}
function byId(db, id) { return present(db.prepare('SELECT * FROM missions WHERE id = ?').get(text(id, 'Mission', 160, true))); }
function append(db, missionId, body, author, label = '', url = '', now = new Date().toISOString(), kind = 'NOTE') {
  const result = db.prepare('INSERT INTO mission_log_entries (mission_id, body, author, link_label, link_url, created_at, kind) VALUES (?, ?, ?, ?, ?, ?, ?)').run(missionId, body, author, label || null, url || null, now, kind);
  return db.prepare('SELECT * FROM mission_log_entries WHERE id = ?').get(Number(result.lastInsertRowid));
}
export function listMissions(filters = {}) {
  object(filters);
  for (const key of Object.keys(filters)) if (!['status', 'mission_type', 'tag', 'limit', 'offset'].includes(key)) throw new DeskError(`Unbekannter Filter: ${key}`);
  if (filters.status !== undefined) choice(filters.status, statusText, 'Status');
  if (filters.mission_type !== undefined) choice(filters.mission_type, missionTypeText, 'Missionstyp');
  if (filters.tag !== undefined) text(filters.tag, 'Tag', 40, true);
  const { limit = 100, offset = 0 } = filters;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw new DeskError('Ungültige Seitengröße oder Position.');
  return withDatabase(db => {
    let missions = db.prepare('SELECT * FROM missions ORDER BY mission_number ASC').all().map(present);
    missions = missions.filter(m => (!filters.status || m.status === filters.status) && (!filters.mission_type || m.mission_type === filters.mission_type) && (!filters.tag || m.tags.includes(filters.tag)));
    return { missions: missions.slice(offset, offset + limit), total: missions.length, next_offset: offset + limit < missions.length ? offset + limit : null };
  });
}
export function snapshot() {
  return withDatabase(db => ({ missions: db.prepare('SELECT * FROM missions ORDER BY mission_number ASC').all().map(present), logs: db.prepare('SELECT * FROM mission_log_entries ORDER BY id DESC').all(), mission_types: Object.keys(missionTypeText) }));
}
export function getMission(id) {
  return withDatabase(db => ({ mission: byId(db, id), logs: db.prepare('SELECT * FROM mission_log_entries WHERE mission_id = ? ORDER BY id ASC').all(id) }));
}
export function createMission(input, author = 'Codex') {
  const { execution_assessment, recommendation_reason, ...payload } = object(input);
  const fields = validateFields(payload, ['title', 'objective', 'briefing', 'mission_type', 'tags', 'recommended_model', 'recommended_effort']);
  text(fields.title, 'Titel', 120, true); text(fields.objective, 'Ziel', 300, true);
  const profile = resolveExecution(execution_assessment, fields, recommendation_reason);
  return withDatabase(db => {
    const now = new Date().toISOString(), id = randomUUID();
    const number = db.prepare('SELECT COALESCE(MAX(mission_number), 0) + 1 AS n FROM missions').get().n;
    db.prepare(`INSERT INTO missions (id, mission_number, title, objective, status, mission_type, tags_json, recommended_model, recommended_effort, briefing, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'PLANNED', ?, ?, ?, ?, ?, ?, ?)`).run(id, number, fields.title, fields.objective, fields.mission_type || 'PRODUCT_DESIGN', JSON.stringify(fields.tags || []), profile.recommended_model, profile.recommended_effort, fields.briefing || '', now, now);
    append(db, id, `Mission angelegt.\n${profile.audit}`, author, '', '', now, 'AUDIT');
    return byId(db, id);
  }, true);
}
export function updateMission(id, input, author = 'Codex', expectedVersion) {
  const { execution_assessment, recommendation_reason, ...payload } = object(input);
  const fields = validateFields(payload);
  const reason = recommendation_reason === undefined ? '' : text(recommendation_reason, 'Modellbegründung', 1000);
  let profileAudit = '';
  if (execution_assessment !== undefined) {
    const profile = resolveExecution(execution_assessment, fields, reason);
    fields.recommended_model = profile.recommended_model;
    fields.recommended_effort = profile.recommended_effort;
    profileAudit = profile.audit;
  }
  if (!Object.keys(fields).length) throw new DeskError('Mindestens ein Feld ist erforderlich.');
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) throw new DeskError('Ungültige Version.');
  return withDatabase(db => {
    const current = byId(db, id);
    if (expectedVersion !== undefined && expectedVersion !== current.version) throw new DeskError('Die Mission wurde zwischenzeitlich geändert. Bitte neu laden und Änderungen abgleichen.', 409);
    const next = { ...current, ...fields }, now = new Date().toISOString();
    const profileChanged = next.recommended_model !== current.recommended_model || next.recommended_effort !== current.recommended_effort;
    if (profileChanged && !profileAudit && !reason) throw new DeskError('Bitte die Änderung des Modells oder der Denkstufe begründen (recommendation_reason).');
    if (!profileAudit && (profileChanged || reason)) profileAudit = `Ausführungsprofil: ${modelText[next.recommended_model]} · ${effortText[next.recommended_effort]}.\nBegründung: ${reason}`;
    const closed = ['COMPLETED', 'DISCARDED'].includes(next.status);
    const completed = closed ? (current.status === next.status ? current.completed_at : now) : null;
    db.prepare(`UPDATE missions SET title=?, objective=?, status=?, mission_type=?, tags_json=?, recommended_model=?, recommended_effort=?, briefing=?, result_summary=?, link_label=?, link_url=?, updated_at=?, completed_at=?, version=version+1 WHERE id=?`).run(next.title, next.objective, next.status, next.mission_type, JSON.stringify(next.tags), next.recommended_model, next.recommended_effort, next.briefing, next.result_summary || null, next.link_label || null, next.link_url || null, now, completed, id);
    append(db, id, `Mission aktualisiert: ${Object.keys(fields).join(', ')}.${profileAudit ? `\n${profileAudit}` : ''}`, author, '', '', now, 'AUDIT');
    return byId(db, id);
  }, true);
}
export function addMissionLog(id, input, author = 'Codex') {
  object(input);
  for (const key of Object.keys(input)) if (!['body', 'link_label', 'link_url'].includes(key)) throw new DeskError(`Unbekanntes Feld: ${key}`);
  const body = text(input.body, 'Logbucheintrag', 3000, true), label = text(input.link_label ?? '', 'Link-Bezeichnung', 120), url = link(input.link_url ?? '');
  return withDatabase(db => {
    byId(db, id);
    const now = new Date().toISOString();
    const entry = append(db, id, body, author, label, url, now);
    db.prepare('UPDATE missions SET updated_at=? WHERE id=?').run(now, id);
    return entry;
  }, true);
}
