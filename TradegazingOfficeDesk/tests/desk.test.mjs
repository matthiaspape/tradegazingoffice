import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createMission, updateMission, addMissionLog, getMission, listMissions, snapshot } from '../ops/store.mjs';
import { credentials, authorize, sessionCookie, checkBoundary } from '../ops/auth.mjs';
import { rpc } from '../ops/mcp.mjs';
import { createBackup } from '../ops/backup.mjs';
import { GET, POST, PATCH } from '../app/api/missions/route.ts';
import { POST as postLog } from '../app/api/missions/logs/route.ts';
import { POST as postSession } from '../app/api/local/session/route.ts';
import { POST as postMcp } from '../app/api/mcp/route.ts';
import { registerMissionTools } from '../app/webmcp.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = mkdtempSync(resolve(tmpdir(), 'tradegazing-office-test-'));
process.env.TRADEGAZING_OFFICE_DESK_HOME = resolve(directory, 'live');
const run = (file, args = [], env = process.env) => execFileSync(process.execPath, [resolve(root, file), ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
after(() => rmSync(directory, { recursive: true, force: true }));
const request = (path, method = 'GET', body, extra = {}, authenticated = true) => new Request(`http://127.0.0.1:43120${path}`, {
  method, headers: { host: '127.0.0.1:43120', 'content-type': 'application/json', ...(authenticated ? { authorization: `Bearer ${credentials().token}` } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
const tool = (name, args = {}) => rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
const planning = { work_kind: 'PLANNING', complexity: 'STANDARD' };
let mission;

test('reads never initialize; setup is explicit and idempotent', () => {
  assert.throws(() => snapshot(), /nicht eingerichtet/);
  assert.equal(existsSync(process.env.TRADEGAZING_OFFICE_DESK_HOME), false);
  run('ops/setup.mjs'); const token = credentials().token;
  run('ops/setup.mjs'); assert.equal(credentials().token, token);
  assert.deepEqual(snapshot().missions, []);
});
test('create and edit persist fields, use stable numbering, audit changes and reject stale versions', () => {
  mission = createMission({ title: 'Handelswege', objective: 'Alle Lager versorgen', tags: ['Wege', 'Wege'], briefing: 'Brücken vergleichen.', execution_assessment: planning }, 'Matthias');
  assert.equal(mission.mission_number, 1); assert.deepEqual(mission.tags, ['Wege']);
  assert.equal(getMission(mission.id).logs.length, 1);
  mission = updateMission(mission.id, { status: 'IN_PROGRESS', title: 'Effiziente Handelswege' }, 'Codex', 1);
  assert.equal(mission.briefing, 'Brücken vergleichen.'); assert.equal(mission.version, 2);
  assert.throws(() => updateMission(mission.id, { status: 'COMPLETED' }, 'Codex', 1), /zwischenzeitlich/);
  assert.equal(getMission(mission.id).logs.length, 2);
  const closed = updateMission(mission.id, { status: 'COMPLETED', result_summary: 'Brücke geprüft.' });
  assert.ok(closed.completed_at);
  assert.equal(updateMission(mission.id, { briefing: 'Ergänzt' }).completed_at, closed.completed_at);
  assert.equal(updateMission(mission.id, { status: 'IN_PROGRESS' }).completed_at, null);
});
test('invalid inputs leave the database unchanged; links and SQL-like strings are safe', () => {
  const before = snapshot();
  for (const input of [{}, { title: 'x', objective: 'x', briefing: 'x'.repeat(4001) }, { title: 'x', objective: 'x', tags: 'not-array' }, { title: 'x', objective: 'x', mission_type: 'SHIP_RESEARCH' }, { title: 12, objective: 'x' }, { title: 'x', objective: 'x', extra: 'x' }]) assert.throws(() => createMission(input));
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'https://user:secret@example.com']) assert.throws(() => updateMission(mission.id, { link_url: url }));
  assert.throws(() => addMissionLog('missing', { body: 'test' }));
  assert.throws(() => addMissionLog(mission.id, { body: ' '.repeat(2) }));
  assert.deepEqual(snapshot(), before);
  const entry = addMissionLog(mission.id, { body: "'); DROP TABLE missions; --", link_url: 'https://example.com/plan', link_label: 'Plan' }, 'Matthias');
  assert.equal(entry.author, 'Matthias'); assert.ok(getMission(mission.id).mission);
});
test('all sixteen MCP tools share the store; notifications and unknown methods never mutate', () => {
  const init = rpc({ jsonrpc: '2.0', id: 3, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
  assert.equal(init.result.serverInfo.name, 'tradegazing-office-desk');
  assert.equal(rpc({ jsonrpc: '2.0', id: 4, method: 'tools/list' }).result.tools.length, 16);
  assert.equal(rpc({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'create_mission', arguments: { title: 'Hidden', objective: 'Hidden' } } }), null);
  assert.equal(rpc({ jsonrpc: '2.0', id: 8, method: 'missing' }).error.code, -32601);
  assert.equal(tool('missing').error.code, -32602);
  assert.equal(tool('create_mission', {}).result.isError, true);
  const created = tool('create_mission', { title: 'Grafikstil', objective: 'Farbwelt bestimmen', mission_type: 'DESIGN', tags: ['Grafik'], execution_assessment: { work_kind: 'SYNTHESIS', complexity: 'STANDARD' } }).result.structuredContent.mission;
  assert.ok(created.id);
  assert.equal(tool('get_mission', { mission_id: created.id }).result.structuredContent.mission.title, 'Grafikstil');
  assert.equal(tool('update_mission', { mission_id: created.id, status: 'IN_PROGRESS', expected_version: 1 }).result.isError, false);
  assert.equal(tool('add_mission_log', { mission_id: created.id, body: 'Moosgrün als Idee.' }).result.isError, false);
  assert.equal(tool('list_missions', { tag: 'Grafik' }).result.structuredContent.total, 1);
  assert.equal(tool('list_missions', { limit: 0 }).result.isError, true);
  assert.equal(listMissions({ limit: 1 }).next_offset, 1);
  assert.equal(listMissions({ offset: 1, limit: 1 }).missions[0].id, created.id);
});
test('parallel processes allocate unique mission numbers and survive restart', async () => {
  const before = snapshot().missions.length;
  await Promise.all(Array.from({ length: 5 }, (_, i) => new Promise((done, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', `import {createMission} from './ops/store.mjs'; createMission({title:'Parallel ${i}',objective:'Nummerierung',execution_assessment:{work_kind:'ROUTINE',complexity:'STANDARD'}});`], { cwd: root, env: process.env, stdio: 'pipe' });
    child.on('error', reject); child.on('exit', code => code === 0 ? done() : reject(new Error(`Child ${code}`)));
  })));
  const missions = snapshot().missions;
  assert.equal(missions.length, before + 5);
  assert.equal(new Set(missions.map(m => m.mission_number)).size, missions.length);
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `import {snapshot} from './ops/store.mjs'; console.log(JSON.stringify(snapshot()));`], { cwd: root, env: process.env, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(result), JSON.parse(JSON.stringify(snapshot())));
});
test('loopback boundary, bearer, cookie and cross-origin protection', () => {
  assert.equal(authorize(request('/api/missions')), 'Codex');
  assert.throws(() => authorize(request('/api/missions', 'GET', undefined, {}, false)), /Sitzung/);
  assert.throws(() => authorize(request('/api/missions', 'POST', {}, { origin: 'https://evil.example' })), /Ursprung/);
  assert.throws(() => checkBoundary(request('/', 'GET', undefined, { host: 'evil.example' })), /lokaler/);
  const cookie = sessionCookie().split(';')[0];
  assert.equal(authorize(request('/api/missions', 'GET', undefined, { cookie }, false)), 'Matthias');
  assert.throws(() => authorize(request('/api/missions', 'POST', {}, { cookie }, false)), /Änderungen/);
  assert.equal(authorize(request('/api/missions', 'POST', {}, { cookie, origin: 'http://127.0.0.1:43120', 'sec-fetch-site': 'same-origin' }, false)), 'Matthias');
});
test('REST and HTTP MCP routes enforce authentication and validate real payloads', async () => {
  assert.equal((await GET(request('/api/missions', 'GET', undefined, {}, false))).status, 401);
  assert.equal((await postSession(request('/api/local/session', 'POST', {}, {}, false))).status, 403);
  const session = await postSession(request('/api/local/session', 'POST', {}, { origin: 'http://127.0.0.1:43120', 'sec-fetch-site': 'same-origin', 'x-desk-session': '1' }, false));
  assert.equal(session.status, 200); assert.match(session.headers.get('set-cookie'), /HttpOnly/);
  const response = await POST(request('/api/missions', 'POST', { title: 'REST Mission', objective: 'REST und MCP verbinden', missionType: 'TESTING', executionAssessment: planning }));
  assert.equal(response.status, 201); const created = await response.json();
  assert.equal((await PATCH(request('/api/missions', 'PATCH', { id: created.id, expectedVersion: 1, resultSummary: 'Geprüft', status: 'COMPLETED' }))).status, 200);
  assert.equal((await PATCH(request('/api/missions', 'PATCH', { id: created.id, expectedVersion: 1, status: 'PLANNED' }))).status, 409);
  assert.equal((await postLog(request('/api/missions/logs', 'POST', { missionId: created.id, body: 'Log via REST' }))).status, 201);
  const read = await postMcp(request('/api/mcp', 'POST', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_mission', arguments: { mission_id: created.id } } }));
  const data = (await read.json()).result.structuredContent;
  assert.equal(data.mission.result_summary, 'Geprüft'); assert.equal(data.logs.at(-1).body, 'Log via REST');
  assert.equal((await POST(request('/api/missions', 'POST', { title: 'x'.repeat(70000), objective: 'x' }))).status, 413);
  assert.equal((await POST(request('/api/missions', 'POST', null))).status, 400);
  const invalid = new Request('http://127.0.0.1:43120/api/mcp', { method: 'POST', headers: { host: '127.0.0.1:43120', authorization: `Bearer ${credentials().token}`, 'content-type': 'application/json' }, body: '{broken' });
  assert.equal((await (await postMcp(invalid)).json()).error.code, -32700);
});
test('stdio bridge carries initialization and tools across an actual HTTP connection', async () => {
  // Dedicated test listener, never the user's live Desk. The bridge endpoint is fixed.
  const source = readFileSync(resolve(root, 'ops/mcp-stdio.mjs'), 'utf8');
  const server = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const incoming = new Request('http://127.0.0.1:43120/api/mcp', { method: 'POST', headers: { ...req.headers, host: '127.0.0.1:43120' }, body: Buffer.concat(chunks) });
    const reply = await postMcp(incoming); res.writeHead(reply.status, Object.fromEntries(reply.headers)); res.end(await reply.text());
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    // Keep actual bridge code and imports; only point it at the isolated test listener.
    const code = source.replace("from './auth.mjs'", "from './ops/auth.mjs'").replace("import { origin } from './config.mjs';", `const origin = 'http://127.0.0.1:${server.address().port}';`);
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { cwd: root, env: process.env, stdio: 'pipe' });
    let output = ''; child.stdout.on('data', data => output += data);
    child.stdin.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }) + '\n' + JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n' + JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
    const [codeResult] = await once(child, 'exit'); assert.equal(codeResult, 0);
    const replies = output.trim().split('\n').map(JSON.parse); assert.equal(replies.length, 2);
    assert.equal(replies[0].result.serverInfo.name, 'tradegazing-office-desk'); assert.equal(replies[1].result.tools.length, 16);
  } finally { await new Promise(done => server.close(done)); }
});
test('WebMCP adapter exposes shared tools, refreshes after success, rejects invalid input and cleans up', async () => {
  const registered = []; let refreshed = 0;
  const cleanup = registerMissionTools({ registerTool: (tool, options) => registered.push({ tool, options }) }, async (name, args) => {
    const reply = tool(name, args); if (reply.result.isError) throw new Error(reply.result.content[0].text); return reply.result.structuredContent;
  }, async () => { refreshed++; });
  assert.equal(registered.length, 16);
  const create = registered.find(item => item.tool.name === 'create_mission').tool;
  const result = await create.execute({ title: 'WebMCP', objective: 'Gleiche Oberfläche', execution_assessment: planning });
  assert.equal(getMission(result.mission.id).mission.title, 'WebMCP'); assert.equal(refreshed, 1);
  await assert.rejects(() => create.execute({ title: '' })); assert.equal(refreshed, 1);
  cleanup(); assert.ok(registered.every(item => item.options.signal.aborted));
});
test('backup and restore preserve all records, rotate credentials, and never overwrite a destination', async () => {
  const before = snapshot(); const source = await createBackup();
  const target = resolve(directory, 'restored'); run('ops/restore.mjs', [source, target]);
  assert.throws(() => run('ops/restore.mjs', [source, target]));
  const currentHome = process.env.TRADEGAZING_OFFICE_DESK_HOME, oldToken = credentials().token;
  process.env.TRADEGAZING_OFFICE_DESK_HOME = target;
  try { assert.deepEqual(snapshot(), before); assert.notEqual(credentials().token, oldToken); } finally { process.env.TRADEGAZING_OFFICE_DESK_HOME = currentHome; }
  const db = new DatabaseSync(source, { readOnly: true }); assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); db.close();
});
