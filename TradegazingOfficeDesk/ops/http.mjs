import { DeskError } from './contract.mjs';
export async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new DeskError('JSON erforderlich.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DeskError('JSON erforderlich.');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) { await reader.cancel(); throw new DeskError('Anfrage ist zu groß.', 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new DeskError('Ungültiges JSON.'); }
}
export async function handle(fn) {
  try { return await fn(); } catch (error) {
    if (!(error instanceof DeskError)) console.error('TradegazingOfficeDesk:', error);
    return Response.json({ error: error instanceof DeskError ? error.message : 'Die Anfrage konnte nicht verarbeitet werden.' }, { status: error instanceof DeskError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
const aliases = { missionType: 'mission_type', recommendedModel: 'recommended_model', recommendedEffort: 'recommended_effort', executionAssessment: 'execution_assessment', recommendationReason: 'recommendation_reason', resultSummary: 'result_summary', linkLabel: 'link_label', linkUrl: 'link_url' };
export function restFields(input) { return Object.fromEntries(Object.entries(input).map(([k, v]) => [aliases[k] || k, v])); }
