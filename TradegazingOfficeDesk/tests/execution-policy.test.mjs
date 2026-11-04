import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { recommendExecution, policyVersion } from '../ops/execution-policy.mjs';
import { createMission, updateMission, getMission, snapshot } from '../ops/store.mjs';
import { rpc } from '../ops/mcp.mjs';
import { credentials } from '../ops/auth.mjs';
import { POST, PATCH } from '../app/api/missions/route.ts';

const directory = mkdtempSync(resolve(tmpdir(), 'tradegazing-office-policy-test-'));
process.env.TRADEGAZING_OFFICE_DESK_HOME = resolve(directory, 'desk');
after(() => rmSync(directory, { recursive: true, force: true }));
const assess = (work_kind, complexity = 'STANDARD') => ({ work_kind, complexity });
const planning = assess('PLANNING');
const task = { title: 'Profiltest', objective: 'Modellentscheidungen nachvollziehbar machen' };
const call = (name, args) => rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
const request = (method, data) => new Request('http://127.0.0.1:43120/api/missions', { method, headers: { host: '127.0.0.1:43120', 'content-type': 'application/json', authorization: `Bearer ${credentials().token}` }, body: JSON.stringify(data) });

test('recommendation requires explicit assessment and works before database setup', () => {
  const answer = call('recommend_mission_profile', { execution_assessment: assess('FOUNDATION') });
  assert.equal(answer.result.structuredContent.recommended_model, 'gpt-6-astra');
  assert.equal(answer.result.structuredContent.recommended_effort, 'medium');
  assert.equal(answer.result.structuredContent.policy_version, policyVersion);
  assert.equal(existsSync(process.env.TRADEGAZING_OFFICE_DESK_HOME), false);
  for (const input of [undefined, null, [], {}, {work_kind:'SYNTHESIS'}, {work_kind:'Research', complexity:'STANDARD'}, {work_kind:'PLANNING',complexity:'unknown'}, {...planning, extra:true}]) assert.throws(() => recommendExecution(input));
  assert.ok(call('recommend_mission_profile', {}).result.isError);
});

test('agreed mission examples keep model and reasoning decisions separate', () => {
  const examples = [
    ['FOUNDATION', 'STANDARD', 'gpt-6-astra', 'medium'], // Engine / economy / core rules / synthesis of all decisions.
    ['FOUNDATION', 'DEMANDING', 'gpt-6-astra', 'high'],
    ['SYNTHESIS', 'STANDARD', 'gpt-5.6-sol', 'medium'], // Vision / art / world.
    ['SYNTHESIS', 'DEMANDING', 'gpt-5.6-sol', 'high'], // Name-rights / business model.
    ['PLANNING', 'STANDARD', 'gpt-5.6-terra', 'medium'], // Initial UX / sound / collaboration.
    ['PLANNING', 'DEMANDING', 'gpt-5.6-terra', 'high'],
    ['ROUTINE', 'STANDARD', 'gpt-5.6-luna', 'low'],
    ['ROUTINE', 'DEMANDING', 'gpt-5.6-luna', 'medium'],
  ];
  for (const [kind, difficulty, model, effort] of examples) {
    const result = recommendExecution(assess(kind, difficulty));
    assert.equal(result.recommended_model, model); assert.equal(result.recommended_effort, effort);
    assert.ok(result.reason); assert.deepEqual(result.execution_assessment, assess(kind, difficulty));
  }
});

test('missing assessment cannot silently create a Terra mission via REST or MCP', async () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../ops/setup.mjs', import.meta.url))], { env: process.env, stdio: 'pipe' });
  assert.throws(() => createMission(task), /execution_assessment/);
  assert.equal((await POST(request('POST', task))).status, 400);
  assert.equal(call('create_mission', task).result.isError, true);
  assert.deepEqual(snapshot().missions, []);
});

test('REST graph selection and MCP read-back preserve the reason and actual profile', async () => {
  const response = await POST(request('POST', { ...task, executionAssessment: assess('FOUNDATION'), recommendationReason: 'Enginewahl beeinflusst Grafik und Simulation.' }));
  assert.equal(response.status, 201);
  const mission = await response.json();
  const { mission: saved, logs } = call('get_mission', { mission_id: mission.id }).result.structuredContent;
  assert.equal(saved.recommended_model, 'gpt-6-astra'); assert.equal(saved.recommended_effort, 'medium');
  assert.equal(logs.length, 1); assert.match(logs[0].body, /FOUNDATION \/ STANDARD/);
  assert.match(logs[0].body, /Enginewahl beeinflusst Grafik und Simulation/);
  assert.match(logs[0].body, /tradegazing-office-execution\/1/);
  assert.equal(saved.status, 'PLANNED'); assert.equal(saved.briefing, '');
});

test('manual user choice wins when complete and justified; malformed overrides never write', () => {
  const before = snapshot();
  for (const fields of [
    { recommended_model: 'gpt-6-astra' },
    { recommended_effort: 'high' },
    { recommended_model: 'gpt-6-astra', recommended_effort: 'high' },
    { recommended_model: 'gpt-6-astra', recommended_effort: 'high', recommendation_reason: ' ' },
    { recommended_model: 'gpt-6-astra', recommended_effort: 'max', recommendation_reason: 'x' },
    { recommendation_reason: 5 },
  ]) assert.throws(() => createMission({ ...task, execution_assessment: planning, ...fields }));
  assert.deepEqual(snapshot(), before);
  const mission = createMission({ ...task, execution_assessment: planning, recommended_model: 'gpt-6-astra', recommended_effort: 'high', recommendation_reason: 'Ausdrücklicher Qualitätswunsch des Nutzers.' });
  const {logs} = getMission(mission.id);
  assert.equal(mission.recommended_model, 'gpt-6-astra'); assert.equal(mission.recommended_effort, 'high');
  assert.match(logs[0].body, /Terra · Medium/); assert.match(logs[0].body, /Bewusste Abweichung: Astra · High/);
  assert.match(logs[0].body, /Ausdrücklicher Qualitätswunsch/);
});

test('reassessment audits even an unchanged profile; manual changes require reason and respect stale versions', async () => {
  let mission = createMission({ ...task, execution_assessment: planning, briefing: 'Unverändert lassen.' });
  const before = getMission(mission.id);
  assert.throws(() => updateMission(mission.id, { recommended_model: 'gpt-5.6-sol' }, 'Codex', mission.version), /begründen/);
  assert.deepEqual(getMission(mission.id), before);
  mission = updateMission(mission.id, { execution_assessment: planning, recommendation_reason: 'Terra nach Einzelprüfung bestätigt.' }, 'Codex', mission.version);
  assert.equal(mission.recommended_model, 'gpt-5.6-terra');
  assert.match(getMission(mission.id).logs.at(-1).body, /Einzelprüfung bestätigt/);
  const priorVersion = mission.version;
  mission = updateMission(mission.id, { execution_assessment: assess('SYNTHESIS', 'DEMANDING') }, 'Codex', mission.version);
  assert.equal(mission.recommended_model, 'gpt-5.6-sol'); assert.equal(mission.recommended_effort, 'high');
  assert.equal(mission.briefing, 'Unverändert lassen.'); assert.equal(mission.status, 'PLANNED');
  assert.throws(() => updateMission(mission.id, { execution_assessment: planning }, 'Codex', priorVersion), /zwischenzeitlich/);
  const response = await PATCH(request('PATCH', { id: mission.id, expectedVersion: mission.version, recommendedModel:'gpt-6-astra', recommendedEffort:'medium', recommendationReason:'Grundlagen nach neuem Umfang.' }));
  assert.equal(response.status, 200);
  const saved = await response.json(); assert.equal(saved.recommended_model, 'gpt-6-astra');
  assert.equal(saved.recommended_effort, 'medium'); assert.match(getMission(saved.id).logs.at(-1).body, /Grundlagen nach neuem Umfang/);
  assert.equal(updateMission(saved.id, { status: 'IN_PROGRESS' }, 'Codex', saved.version).recommended_model, 'gpt-6-astra');
});
