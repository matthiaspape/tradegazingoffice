import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { bugDraft, occurrence } from './bug-fixture.mjs';
import { createBug, updateBug, addBugOccurrence, listBugs, getBug } from '../ops/bug-board.mjs';
import { initializeBugBoard } from '../ops/bug-schema.mjs';
import { createMission } from '../ops/store.mjs';
import { databasePath, origin } from '../ops/config.mjs';
import { credentials, sessionCookie } from '../ops/auth.mjs';
import { GET, POST, PATCH, PUT } from '../app/api/bugs/route.ts';
import { POST as postMcp } from '../app/api/mcp/route.ts';
import { createBackup } from '../ops/backup.mjs';

const home = mkdtempSync(resolve(tmpdir(), 'office-bugs-'));
process.env.TRADEGAZING_OFFICE_DESK_HOME = resolve(home, 'live');
const run = (file, args = []) => execFileSync(process.execPath, [file, ...args], { env:process.env, encoding:'utf8', stdio:'pipe' });
run('ops/setup.mjs');
after(() => rmSync(home, { recursive:true, force:true }));
let sequence = 0;
const key = () => `office-test-${++sequence}`;
const args = (bug = {}, sighting = {}) => ({ request_key:key(), bug:bugDraft(bug), occurrence:occurrence(sighting) });
const request = (method = 'GET', payload, headers = {}, path = '/api/bugs', auth = true) => new Request(origin + path, { method, headers:{host:new URL(origin).host, 'content-type':'application/json', ...(auth ? {authorization:`Bearer ${credentials().token}`} : {}), ...headers}, ...(payload === undefined ? {} : {body:JSON.stringify(payload)}) });
async function mcp(name, input) {
  const response = await postMcp(request('POST', {jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:input}}, {}, '/api/mcp'));
  return (await response.json()).result;
}

test('explicit setup is empty and repeatable; board reads never write', () => {
  assert.equal(listBugs().total, 0);
  const before = readFileSync(databasePath());
  listBugs(); run('ops/setup.mjs');
  assert.deepEqual(readFileSync(databasePath()), before);
  assert.throws(() => initializeBugBoard({approved:true}), /Offline/);
  assert.equal(initializeBugBoard({approved:true,offline:true}).created, false);
});
test('REST creates a linked Office bug and MCP returns the same data; retries are idempotent', async () => {
  const mission = createMission({title:'Office testen',objective:'Projektverwaltung prüfen',mission_type:'TESTING',execution_assessment:{work_kind:'PLANNING',complexity:'STANDARD'}});
  const input = args({probability:'UNBEKANNT'}, {mission_id:mission.id});
  const response = await POST(request('POST', input));
  assert.equal(response.status, 200);
  const created = await response.json();
  assert.equal(created.label, 'OFFICE-BUG-0001');
  assert.deepEqual((await mcp('bug_create', input)).structuredContent, created);
  const read = await mcp('bug_get', {id:created.id});
  assert.equal(read.structuredContent.occurrences[0].mission_id, mission.id);
  assert.equal(read.structuredContent.probability, 'UNBEKANNT');
  assert.equal(read.structuredContent.events.length, 1);
  const rest = await GET(request('GET', undefined, {}, '/api/bugs?mission_id='+mission.id));
  assert.deepEqual(await rest.json(), (await mcp('bug_list', {mission_id:mission.id})).structuredContent);
  assert.equal((await POST(request('POST', {...input,bug:bugDraft({title:'Andere Nutzlast'})}))).status, 409);
});
test('revision conflicts, retry-before-revision and append-only occurrence history', async () => {
  const created = createBug(args(), 'Test');
  const change = {request_key:key(),id:created.id,expected_revision:created.revision,patch:{owner:'Reviewer'}};
  const first = await PATCH(request('PATCH', change)); const updated = await first.json();
  assert.deepEqual((await mcp('bug_update',change)).structuredContent, updated);
  assert.equal((await PATCH(request('PATCH', {...change,request_key:key()}))).status, 409);
  const append = {request_key:key(),id:created.id,occurrence:occurrence({reason:'Neuer unabhängiger Beleg'})};
  assert.equal((await PUT(request('PUT',append))).status, 200);
  assert.equal(getBug(created.id).occurrences.length, 2);
});
test('invalid missions and unproved blockers roll back all related rows and events', async () => {
  const before = readFileSync(databasePath());
  for (const patch of [{mission_id:'missing'},{decision:'BLOCKIERT',evidence_state:'VERDACHT'},{decision:'BLOCKIERT',blocked_step:'',no_workaround:''},{evidence_ref:'javascript:alert(1)'}]) {
    const input = args({},patch);
    assert.ok((await POST(request('POST',input))).status >= 400);
    const reply = await mcp('bug_create',{...input,request_key:key()});
    assert.equal(reply.isError,true);
  }
  assert.deepEqual(readFileSync(databasePath()),before);
});
test('context-bound blockers, lifecycle end, duplicates and reopening retain original evidence', () => {
  const created = createBug(args({risk:'HOCH'}, {decision:'BLOCKIERT',blocked_step:'Ergebnisberechnung',no_workaround:'Erforderlicher Kostenbeleg fehlt.'}), 'Test');
  assert.equal(listBugs({q:created.label}).summary.blockers,1);
  addBugOccurrence({request_key:key(),id:created.id,occurrence:occurrence({run_id:'other'})},'Test');
  assert.equal(listBugs({q:created.label}).summary.blockers,1);
  addBugOccurrence({request_key:key(),id:created.id,occurrence:occurrence({decision:'KONTEXT_BEENDET'})},'Test');
  assert.equal(listBugs({q:created.label}).summary.blockers,0);
  const resolved = updateBug({request_key:key(),id:created.id,expected_revision:getBug(created.id).revision,patch:{status:'ERLEDIGT',resolution:'Gezielter Beleg im Test'}},'Test');
  assert.equal(addBugOccurrence({request_key:key(),id:created.id,occurrence:occurrence()},'Test').status,'NEU');
  const duplicate = createBug(args(),'Test');
  updateBug({request_key:key(),id:duplicate.id,expected_revision:duplicate.revision,patch:{status:'DUPLIKAT',duplicate_of:created.id}},'Test');
  assert.throws(()=>addBugOccurrence({request_key:key(),id:duplicate.id,occurrence:occurrence()},'Test'),e=>e.status===409);
  assert.throws(()=>updateBug({request_key:key(),id:created.id,expected_revision:getBug(created.id).revision,patch:{status:'DUPLIKAT',duplicate_of:duplicate.id}},'Test'));
  assert.ok(resolved.revision>created.revision);
});
test('GET, writes and MCP enforce the same Office auth and hostile-origin boundary', async () => {
  const before = readFileSync(databasePath());
  assert.equal((await GET(request('GET',undefined,{},'/api/bugs',false))).status,401);
  assert.equal((await POST(request('POST',args(),{},'/api/bugs',false))).status,401);
  assert.equal((await POST(request('POST',args(),{origin:'https://evil.example'}))).status,403);
  assert.deepEqual(readFileSync(databasePath()),before);
  const cookie = sessionCookie().split(';')[0];
  const browser = await POST(request('POST',args(),{cookie,origin,'sec-fetch-site':'same-origin'},'/api/bugs',false));
  assert.equal(browser.status,200);
  assert.equal((await GET(request('GET',undefined,{host:'127.0.0.1:43117'}))).status,403);
});
test('backup and restore preserve Office bugs; missing schema is explicit without read-time migration', async () => {
  const before = listBugs(); const backup = await createBackup();
  run('ops/restore.mjs',[backup,resolve(home,'restore')]);
  const current = process.env.TRADEGAZING_OFFICE_DESK_HOME;
  process.env.TRADEGAZING_OFFICE_DESK_HOME = resolve(home,'restore');
  try { assert.deepEqual(listBugs(),before); } finally { process.env.TRADEGAZING_OFFICE_DESK_HOME=current; }
  const db = new DatabaseSync(databasePath()); db.exec('DROP TABLE bug_events'); db.close();
  const bytes=readFileSync(databasePath());
  const response = await GET(request()); const error = await response.json();
  assert.equal(response.status,503); assert.equal(error.code,'BUG_BOARD_SCHEMA_MISSING');
  assert.equal((await mcp('bug_list',{})).structuredContent.code,'BUG_BOARD_SCHEMA_MISSING');
  assert.deepEqual(readFileSync(databasePath()),bytes);
});
