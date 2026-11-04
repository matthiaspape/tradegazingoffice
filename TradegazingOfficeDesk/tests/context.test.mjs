import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createContextEntry, updateContextEntry, getContextEntry, listContextEntries, getProjectContext } from '../ops/context-store.mjs';
import { createMission, addMissionLog, snapshot } from '../ops/store.mjs';
import { migrate } from '../ops/migrate.mjs';
import { createBackup } from '../ops/backup.mjs';
import { credentials, sessionCookie } from '../ops/auth.mjs';
import { rpc } from '../ops/mcp.mjs';
import { POST as postMcp } from '../app/api/mcp/route.ts';
import { registerMissionTools } from '../app/webmcp.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = mkdtempSync(resolve(tmpdir(), 'tradegazing-office-context-'));
let counter = 0;
after(() => rmSync(directory, { recursive: true, force: true }));
const run = (file, args = []) => execFileSync(process.execPath, [resolve(root, file), ...args], { env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
async function isolated(work, setup = true) {
  const previous = process.env.TRADEGAZING_OFFICE_DESK_HOME;
  process.env.TRADEGAZING_OFFICE_DESK_HOME = resolve(directory, String(counter++));
  try { if (setup) run('ops/setup.mjs'); await work(); }
  finally { if (previous === undefined) delete process.env.TRADEGAZING_OFFICE_DESK_HOME; else process.env.TRADEGAZING_OFFICE_DESK_HOME = previous; }
}
const draft = (key, extra = {}) => ({ key, title: 'Lager wachsen', summary: 'Versorgung ermöglicht Wachstum.', kind: 'DECISION', topic: 'ACCOUNTING', sources: [{ type: 'USER', ref: 'Nutzervorgabe im Testgespräch am 08.09.2026', label: 'Spielidee' }], change_reason: 'Erkenntnis für weitere Missionen festhalten.', ...extra });
const confirmed = (key, extra = {}) => draft(key, { status: 'CONFIRMED', confirmation_note: 'Im Test ausdrücklich bestätigt.', ...extra });
const tool = (name, args = {}) => rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }).result;
const mission = () => createMission({ title: 'Wirtschaft planen', objective: 'Versorgung und Wachstum abstimmen', tags: ['Handel'], execution_assessment: { work_kind: 'FOUNDATION', complexity: 'STANDARD' } });

test('legal register: exact filters, evidence distinction, history and optimistic updates', () => isolated(() => {
  const legal = createContextEntry(confirmed('legal-engine', { kind: 'REFERENCE', tags: ['legal-license', 'rights-open'], content: 'Version und Einsatz erfasst. Lizenzprüfung offen.' }));
  assert.deepEqual(legal.tags, ['LEGAL-LICENSE', 'RIGHTS-OPEN']);
  assert.throws(() => createContextEntry(draft('legal-bypass', { tags: ['legal-license', 'rights-evidenced'], content: 'Ohne Beleg' })), /Belegte Nutzungsrechte/);
  createContextEntry(draft('not-legal', { tags: ['LEGAL-LICENSE-EXAMPLE'], content: 'LEGAL-LICENSE im Fließtext ist kein Registertag.' }));
  const question = createContextEntry(draft('legal-question', { kind: 'QUESTION', status: 'OPEN', tags: ['LEGAL-LICENSE', 'RIGHTS-OPEN'], content: 'Ist Spieleinbettung erlaubt?' }));
  const page = tool('list_context_entries', { tag: 'legal-license', limit: 1 });
  assert.equal(page.isError, false); assert.equal(page.structuredContent.total, 2); assert.equal(page.structuredContent.next_offset, 1);
  assert.equal(tool('list_context_entries', { tag: 'LEGAL-LICENSE', offset: 1 }).structuredContent.entries.length, 1);
  assert.equal(listContextEntries({ tag: 'LEGAL-LICENSE', status: 'OPEN' }).entries[0].id, question.id);
  assert.equal(listContextEntries({ legal_status: 'RIGHTS-EVIDENCED' }).total, 0);
  assert.throws(() => updateContextEntry(legal.id, { tags: ['LEGAL-LICENSE', 'RIGHTS-EVIDENCED'], change_reason: 'Belegen' }, 'Test', 1), /Bestätigungsgrundlage/);
  assert.throws(() => updateContextEntry(legal.id, { tags: ['LEGAL-LICENSE', 'RIGHTS-EVIDENCED'], confirmation_note: 'Nur eine Behauptung', change_reason: 'Belegen' }, 'Test', 1), /Dokument- oder Webquelle/);
  assert.throws(() => updateContextEntry(legal.id, { tags: ['LEGAL-LICENSE', 'RIGHTS-OPEN', 'RIGHTS-BLOCKED'], confirmation_note: 'Test', change_reason: 'Test' }, 'Test', 1), /genau einen/);
  assert.throws(() => updateContextEntry(legal.id, { tags: [], confirmation_note: 'Test', change_reason: 'Entfernen' }, 'Test', 1), /behalten/);
  const updated = updateContextEntry(legal.id, { tags: ['LEGAL-LICENSE', 'RIGHTS-EVIDENCED'], confirmation_note: 'Konkreter Einsatz und Nachweis geprüft im Test.', sources: [{ type: 'DOCUMENT', ref: 'assets/licenses/LICENSE.txt', label: 'Lizenztext' }], change_reason: 'Nachweis ergänzen' }, 'Test', 1);
  assert.equal(listContextEntries({ legal_status: 'RIGHTS-EVIDENCED' }).entries[0].id, legal.id);
  assert.throws(() => updateContextEntry(legal.id, { content: 'Alter Stand', change_reason: 'Stale' }, 'Test', 1), /zwischenzeitlich/);
  const history = getContextEntry(legal.id); assert.equal(history.history_total, 2); assert.ok(history.revisions[1].snapshot.tags.includes('RIGHTS-OPEN'));
  updateContextEntry(legal.id, { status: 'SUPERSEDED', change_reason: 'Version ersetzt' }, 'Test', updated.version);
  assert.equal(listContextEntries({ tag: 'LEGAL-LICENSE' }).total, 1);
  assert.equal(listContextEntries({ tag: 'LEGAL-LICENSE', status: 'ALL' }).total, 2);
  assert.throws(() => listContextEntries({ legal_status: 'APPROVED' }), /Rechteprüfstatus/);
}));

test('context reads never initialize; explicit migration preserves v1 missions, logs and credentials', () => isolated(async () => {
  assert.throws(() => getProjectContext(), /nicht eingerichtet/);
  assert.equal(existsSync(process.env.TRADEGAZING_OFFICE_DESK_HOME), false);
  mkdirSync(process.env.TRADEGAZING_OFFICE_DESK_HOME, { mode: 0o700 });
  const db = new DatabaseSync(resolve(process.env.TRADEGAZING_OFFICE_DESK_HOME, 'missions.sqlite'));
  db.exec(readFileSync(new URL('./fixtures/schema-v1.sql', import.meta.url), 'utf8')); db.close();
  run('ops/setup.mjs');
  const m = mission(); addMissionLog(m.id, { body: 'Bestehender Zwischenstand' });
  const before = snapshot(), token = credentials().token;
  assert.throws(() => listContextEntries(), /Migration/);
  const result = await migrate(); assert.equal(result.changed, true); assert.ok(existsSync(result.backup));
  const backup = new DatabaseSync(result.backup, { readOnly: true });
  assert.equal(backup.prepare('PRAGMA user_version').get().user_version, 1); backup.close();
  assert.deepEqual(snapshot(), before); assert.equal(credentials().token, token);
  assert.equal(listContextEntries().total, 0);
  assert.deepEqual(await migrate(), { changed: false, version: 2 });
  run('ops/setup.mjs'); assert.deepEqual(snapshot(), before);
}, false));

test('invalid provenance, unconfirmed claims and malformed input do not create records', () => isolated(() => {
  const bad = [
    { sources: [] }, { sources: [{ type: 'MISSION', ref: 'missing', label: 'Missing' }] },
    { sources: [{ type: 'WEB', ref: 'javascript:alert(1)', label: 'Unsicher' }] },
    { sources: [{ type: 'WEB', ref: 'https://user:secret@example.com', label: 'Unsicher' }] },
    { sources: [{ type: 'DOCUMENT', ref: 'Tradegazing Office/../secret', label: 'Unsicher' }] },
    { sources: [{ type: 'DOCUMENT', ref: '/etc/passwd', label: 'Unsicher' }] },
    { sources: [{ type: 'USER', ref: '', label: 'Leer' }] }, { status: 'CONFIRMED' },
    { status: 'SUPERSEDED' }, { status: 'OPEN' }, { confirmation_note: 'Trotzdem bestätigt' },
    { kind: 'QUESTION', status: 'CONFIRMED', confirmation_note: 'x' }, { is_core: true },
    { title: '' }, { summary: 'x'.repeat(501) }, { kind: 'BOGUS' }, { extra: 'x' }, { change_reason: '' },
  ];
  for (const input of bad) assert.throws(() => createContextEntry(draft('invalid', input)));
  assert.equal(listContextEntries({ status: 'ALL' }).total, 0);
  const q = createContextEntry(draft('frage', { kind: 'QUESTION' })); assert.equal(q.status, 'OPEN');
  const p = createContextEntry(draft('vorschlag')); assert.equal(p.status, 'PROPOSED');
  assert.equal(getProjectContext().core.total, 0);
  assert.throws(() => listContextEntries({ query: null }));
  assert.throws(() => getProjectContext({ limit: 21 }));
}));

test('full revisions retain provenance and confirmation; stale or unsupported updates cannot overwrite knowledge', () => isolated(() => {
  const entry = createContextEntry(confirmed('wachstum', { is_core: true }), 'Matthias');
  assert.throws(() => createContextEntry(draft('wachstum')), /existiert/);
  assert.throws(() => updateContextEntry(entry.id, { summary: 'Anders', change_reason: 'Neue Idee' }, 'Codex', 1), /Bestätigungsgrundlage/);
  assert.throws(() => updateContextEntry(entry.id, { title: 'Anders', change_reason: 'Neue Idee' }), /expected_version/);
  assert.throws(() => updateContextEntry(entry.id, { key: 'anders', change_reason: 'Neue Idee' }, 'Codex', 1), /unveränderlich/);
  const changed = updateContextEntry(entry.id, { summary: 'Regelmäßige Versorgung lässt die Lager wachsen.', confirmation_note: 'Im zweiten Testgespräch bestätigt.', change_reason: 'Wachstumsvoraussetzung präzisiert.' }, 'Codex', 1);
  assert.equal(changed.version, 2); assert.equal(changed.key, entry.key);
  assert.throws(() => updateContextEntry(entry.id, { status: 'PROPOSED', change_reason: 'Alter Stand' }, 'Codex', 1), /zwischenzeitlich/);
  let data = getContextEntry(entry.id, { history_limit: 1 });
  assert.equal(data.history_total, 2); assert.equal(data.next_history_offset, 1);
  assert.equal(data.revisions[0].author, 'Codex');
  assert.deepEqual(getContextEntry(entry.id, { history_offset: 1 }).revisions[0].snapshot, entry);
  const reconsidered = updateContextEntry(entry.id, { status: 'PROPOSED', change_reason: 'Entscheidung wieder zur Diskussion stellen.' }, 'Matthias', 2);
  assert.equal(reconsidered.confirmation_note, ''); assert.equal(reconsidered.is_core, false);
  assert.equal(getProjectContext().core.total, 0);
  const db = new DatabaseSync(resolve(process.env.TRADEGAZING_OFFICE_DESK_HOME, 'missions.sqlite'));
  assert.throws(() => db.exec('DELETE FROM context_revisions'), /append-only/);
  assert.throws(() => db.exec("UPDATE context_revisions SET author='x'"), /append-only/);
  assert.throws(() => db.exec('DELETE FROM context_entries'), /Retire/); db.close();
}));

test('supersession removes obsolete knowledge from retrieval, preserves history and follows a confirmed successor', () => isolated(() => {
  const old = createContextEntry(confirmed('alt', { is_core: true }));
  const proposal = createContextEntry(draft('idee'));
  assert.throws(() => updateContextEntry(old.id, { status: 'SUPERSEDED', superseded_by: proposal.id, change_reason: 'Ersetzen' }, 'Codex', 1), /bestätigt/);
  const next = createContextEntry(confirmed('neu', { is_core: true }));
  const retired = updateContextEntry(old.id, { status: 'SUPERSEDED', superseded_by: next.id, change_reason: 'Durch neue Regel ersetzt.' }, 'Matthias', 1);
  assert.equal(retired.is_core, false); assert.equal(getContextEntry(old.id).entry.superseded_by, next.id);
  assert.equal(getProjectContext().core.total, 1); assert.equal(getProjectContext().core.entries[0].id, next.id);
  assert.equal(listContextEntries({ status: 'SUPERSEDED' }).total, 1);
  assert.equal(listContextEntries({ status: 'ALL' }).total, 3);
  assert.throws(() => updateContextEntry(old.id, { status: 'CONFIRMED', confirmation_note: 'x', change_reason: 'Zurück' }, 'Codex', 2), /unverändert/);
  assert.throws(() => updateContextEntry(next.id, { status: 'SUPERSEDED', superseded_by: next.id, change_reason: 'Kreis' }, 'Codex', 1));
  assert.throws(() => updateContextEntry(next.id, { status: 'SUPERSEDED', superseded_by: old.id, change_reason: 'Kreis' }, 'Codex', 1));
}));

test('bounded context separates core, relevant confirmations, ideas and questions; search handles German text and mission links', () => isolated(() => {
  const m = mission();
  const core = createContextEntry(confirmed('ios', { topic: 'PLATFORM', is_core: true, title: 'Zielplattform iOS' }));
  const linked = createContextEntry(confirmed('bruecken', { title: 'Brücken über Flüsse', content: 'Gelände verändert Fahrtzeit.', sources: [{ type: 'MISSION', ref: m.id, label: m.title }] }));
  const tagged = createContextEntry(confirmed('handel', { tags: ['HANDEL'] }));
  createContextEntry(draft('wirtschaftsfrage', { kind: 'QUESTION', tags: ['Handel'] }));
  createContextEntry(draft('wirtschaftsidee', { tags: ['Handel'] }));
  createContextEntry(confirmed('unrelated', { topic: 'INTEGRATION' }));
  let context = getProjectContext({ mission_id: m.id, limit: 1 });
  assert.equal(context.core.entries[0].id, core.id); assert.equal(context.confirmed.total, 2); assert.equal(context.confirmed.truncated, true);
  assert.equal(context.proposals.total, 1); assert.equal(context.open_questions.total, 1);
  assert.equal('content' in context.confirmed.entries[0], false); assert.equal('sources' in context.confirmed.entries[0], false);
  assert.equal(listContextEntries({ query: 'BRÜCKEN gelände' }).entries[0].id, linked.id);
  assert.equal(listContextEntries({ mission_id: m.id }).total, 1);
  assert.equal(listContextEntries({ query: "'); DROP TABLE context_entries; --" }).total, 0);
  const first = listContextEntries({ status: 'ALL', limit: 2 }), second = listContextEntries({ status: 'ALL', limit: 2, offset: first.next_offset });
  assert.equal(first.entries.some(e => second.entries.some(s => s.id === e.id)), false);
  assert.throws(() => getProjectContext({ mission_id: 'missing' }), /nicht gefunden/);
  assert.equal(listContextEntries({ query: 'HANDEL' }).entries.some(e => e.id === tagged.id), true);
}));

test('HTTP MCP and browser WebMCP use the same protected context workflow', () => isolated(async () => {
  const payload = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'create_context_entry', arguments: draft('browser') } };
  const request = headers => new Request('http://127.0.0.1:43120/api/mcp', { method: 'POST', headers: { host: '127.0.0.1:43120', 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) });
  assert.equal((await postMcp(request({}))).status, 401);
  assert.equal((await postMcp(request({ cookie: sessionCookie().split(';')[0], origin: 'https://evil.example' }))).status, 403);
  assert.equal(listContextEntries().total, 0);
  const response = await postMcp(request({ cookie: sessionCookie().split(';')[0], origin: 'http://127.0.0.1:43120', 'sec-fetch-site': 'same-origin' }));
  const result = (await response.json()).result; assert.equal(result.isError, false);
  assert.equal(getContextEntry(result.structuredContent.entry.id).revisions[0].author, 'Matthias');
  const registered = [];
  const cleanup = registerMissionTools({ registerTool: tool => registered.push(tool) }, async (name, args) => { const result = tool(name, args); if (result.isError) throw new Error(result.content[0].text); return result.structuredContent; }, async () => { throw new Error('View refresh failed after committed write'); });
  const create = registered.find(t => t.name === 'create_context_entry');
  const created = await create.execute(draft('webmcp')); assert.ok(created.entry.id);
  assert.equal(listContextEntries().total, 2); cleanup();
  assert.equal(tool('get_context_entry', { entry_id: created.entry.id }).structuredContent.entry.status, 'PROPOSED');
  assert.equal(tool('update_context_entry', { entry_id: created.entry.id, status: 'CONFIRMED', change_reason: 'Unvollständig' }).isError, true);
  assert.equal(rpc({ jsonrpc: '2.0', method: 'tools/call', params: payload.params }), null);
  assert.equal(listContextEntries().total, 2);
}));

test('parallel edits cannot overwrite a newer version and state survives a fresh process', () => isolated(async () => {
  const entry = createContextEntry(draft('parallel'));
  const results = await Promise.all([1, 2].map(i => new Promise((done, reject) => {
    const code = `import {updateContextEntry} from './ops/context-store.mjs'; try { updateContextEntry('${entry.id}',{summary:'Änderung ${i}',change_reason:'Gleichzeitige Bearbeitung'},'Codex',1); } catch(error) { if(error.status===409) process.exitCode=9; else throw error; }`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { cwd: root, env: process.env, stdio: 'pipe' });
    child.on('error', reject); child.on('exit', done);
  })));
  assert.deepEqual(results.sort(), [0, 9]); assert.equal(getContextEntry(entry.id).history_total, 2);
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `import {getContextEntry} from './ops/context-store.mjs'; console.log(JSON.stringify(getContextEntry('${entry.id}')));`], { cwd: root, env: process.env, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(result), JSON.parse(JSON.stringify(getContextEntry(entry.id))));
}));

test('backup and restore preserve context revisions together with linked missions', () => isolated(async () => {
  const m = mission();
  const entry = createContextEntry(confirmed('gesichert', { sources: [{ type: 'MISSION', ref: m.id, label: m.title }, { type: 'DOCUMENT', ref: 'docs/konzept.md', label: 'Konzeptverweis' }] }));
  updateContextEntry(entry.id, { status: 'SUPERSEDED', change_reason: 'Zurückgezogen.' }, 'Matthias', 1);
  const before = getContextEntry(entry.id), missionsBefore = snapshot(), token = credentials().token;
  const backup = await createBackup(), target = resolve(directory, `restored-${counter}`), current = process.env.TRADEGAZING_OFFICE_DESK_HOME;
  run('ops/restore.mjs', [backup, target]); process.env.TRADEGAZING_OFFICE_DESK_HOME = target;
  try { assert.deepEqual(getContextEntry(entry.id), before); assert.deepEqual(snapshot(), missionsBefore); assert.notEqual(credentials().token, token); }
  finally { process.env.TRADEGAZING_OFFICE_DESK_HOME = current; }
}));
