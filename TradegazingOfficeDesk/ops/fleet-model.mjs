// M650 read-model adapter. Money is passed through as decimal strings, never calculated here.
import { HEALTH_FRESH_SECONDS, ACCOUNT_FRESH_SECONDS } from './fleet-timing.mjs';
export const items = value => Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
const text = value => typeof value === 'string' ? value.slice(0, 500) : '';
const numeric = value => value !== null && value !== '' && ['number','string'].includes(typeof value) && Number.isFinite(Number(value)) ? Number(value) : null;
export const decimal = value => typeof value === 'string' && /^-?\d{1,24}(?:\.\d{1,12})?$/.test(value) ? value : null;
export const epoch = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
export function freshness(at, now, seconds) {
  const time = epoch(at);
  return time === null ? 'UNKNOWN' : time > now ? 'INVALID' : now - time <= seconds * 1000 ? 'CURRENT' : 'STALE';
}
function ratio(used, total) {
  used = numeric(used); total = numeric(total);
  return used !== null && total !== null && total > 0 && used >= 0 && used <= total ? used / total * 100 : null;
}
function volume(v) {
  const total = numeric(v.size), free = numeric(v.free);
  const used = total !== null && free !== null ? total - free : null;
  const percent = ratio(used, total);
  return { name: text(v.name), total, used: percent === null ? null : used, percent };
}
function ram(sample) {
  const total = numeric(sample.total_ram), free = numeric(sample.available_ram);
  const used = total !== null && free !== null ? total - free : null;
  return { total, used: ratio(used, total) === null ? null : used, percent: ratio(used, total) };
}
export function healthModel(raw, now) {
  // A collector restart can produce several sessions in one slot. Choose by observation, not UUID.
  const slots = new Map();
  for (const w of items(raw?.windows)) {
    const at = epoch(w?.last?.observed_at), slot = numeric(w?.slot);
    if (at === null || at > now || at < now - 7 * 86400000 || slot === null || w.last?.available !== true) continue;
    if (Math.floor(at / 300000) !== Math.floor(slot / 300)) continue;
    const old = slots.get(slot);
    if (!old || at > epoch(old.last.observed_at)) slots.set(slot, w);
  }
  const windows = [...slots.values()].sort((a,b) => epoch(a.last.observed_at) - epoch(b.last.observed_at));
  const latest = windows.at(-1), sample = latest?.last ?? {};
  const pct = n => { const v = numeric(n); return v !== null && v >= 0 && v <= 100 ? v : null; };
  return {
    observedAt: sample.observed_at ?? null,
    state: freshness(sample.observed_at, now, HEALTH_FRESH_SECONDS),
    cpu: pct(latest?.cpu_mean), cpuMax: pct(latest?.cpu_max), ram: ram(sample),
    volumes: items(sample.volumes).map(volume),
    samples: numeric(latest?.samples), cpuSamples: numeric(latest?.cpu_samples), expected: numeric(latest?.expected_samples),
    attention: items(raw?.attention).filter(v => typeof v === 'string').map(text),
    series: windows.map(w => ({at: w.last.observed_at, cpu: pct(w.cpu_mean), ram: ram(w.last).percent, volumes: items(w.last.volumes).map(volume)})),
    processes: items(sample.processes).map(p => ({pid: numeric(p.pid), startedAt: text(p.started_at), terminal: text(p.terminal_id), binding: text(p.binding), cpu: pct(p.cpu_percent_of_vps), workingSet: numeric(p.working_set), privateBytes: numeric(p.private_bytes)})),
  };
}
function accountMatch(a, b) {
  return a.account_key === b.account_key && a.environment === b.environment && (a.run_id ?? null) === (b.run_id ?? null)
    && (a.deployment_id === b.deployment_id || items(a.fleet).some(r => r.deployment_id === b.deployment_id));
}
export function fleetModel(binding, accounts, host, now, offline) {
  const matches = items(accounts).filter(a => accountMatch(a, binding));
  const a = matches.length === 1 ? matches[0] : null;
  const freshSeconds = Math.max(host.fresh_seconds, ACCOUNT_FRESH_SECONDS);
  const state = freshness(a?.observed_at, now, freshSeconds);
  const series = items(a?.series).filter(p => epoch(p.at) !== null && epoch(p.at) <= now && epoch(p.at) >= now - 7 * 86400000 && decimal(p.value) !== null)
    .map(p => ({at:p.at, value:p.value})).sort((a,b)=>epoch(a.at)-epoch(b.at));
  const payload = a?.account ?? {};
  return {
    id: `${host.id}.${binding.id}`, hostId: host.id, name: binding.name, broker: binding.broker,
    deploymentId: binding.deployment_id, environment: binding.environment, currency: text(payload.currency),
    observedAt: a?.observed_at ?? null, freshSeconds, state: offline && state === 'CURRENT' ? 'STALE' : state,
    sharedAccount: host.bindings.filter(b => b.account_key === binding.account_key && b.environment === binding.environment && (b.run_id ?? null) === (binding.run_id ?? null)).length > 1,
    balance: decimal(payload.balance), equity: decimal(payload.equity), series,
    // The current M650 projection does not qualify a day boundary or an overall EA operating state.
    profitToday: null, unrealized: null, status: 'Unbekannt',
    reasons: [matches.length > 1 ? 'Widersprüchliche Kontobindung' : !a ? 'Noch keine passende EA-Exportquelle' : 'Tagesnetto, vollständige offene Bewertung und EA-Gesamtstatus sind im Reader noch nicht qualifiziert',
      ...(a?.attention ? items(a.attention).filter(v=>typeof v==='string').map(text) : [])],
    positionMode: text(a?.position_mode),
    variants: items(a?.variants).map(r=>({symbol:text(r.payload?.symbol),timeframe:numeric(r.payload?.timeframe_minutes),pool:text(r.payload?.pool),revision:text(r.payload?.revision),ready:typeof r.payload?.ready==='boolean'?r.payload.ready:null})),
    pools: items(a?.pools).map(r=>({name:text(r.payload?.pool),used:decimal(r.payload?.used?.risk),capacity:decimal(r.payload?.capacity?.risk)})),
    positions: items(a?.positions).map(r=>({symbol:text(r.payload?.symbol),id:text(r.payload?.position_id),volume:decimal(r.payload?.volume),sl:decimal(r.payload?.sl),tp:decimal(r.payload?.tp)})),
  };
}
export function projectHost(host, bundle, now, transport = {}) {
  const valid = bundle?.health?.host_id === host.native_host_id;
  const health = healthModel(valid ? bundle.health : {}, now);
  const offline = !valid || transport.failed === true || bundle?.desk?.connection?.state === 'STALE' || bundle?.health?.connection?.state === 'STALE';
  return {
    id: host.id, name: host.name, ip: host.ip || null,
    ...health, state: offline && health.state === 'CURRENT' ? 'STALE' : health.state,
    connection: !valid ? 'UNAVAILABLE' : offline ? 'STALE' : 'CURRENT',
    lastPull: bundle?.health?.connection?.last_success_at ?? null,
    waitingForEa: bundle?.desk?.source_binding_status === 'WAITING_FOR_EA_EXPORTS',
    unboundAccounts: valid ? items(bundle?.desk?.accounts).filter(a=>!host.bindings.some(b=>accountMatch(a,b))).length : 0,
    fleets: host.bindings.map(b => fleetModel(b, valid ? bundle?.desk?.accounts : [], host, now, offline)),
    issue: !valid ? 'Noch keine erreichbare, passend gebundene Hostquelle' : transport.failed ? 'Backendabruf fehlgeschlagen. Letzter empfangener Stand mit Originalzeiten.' : null,
  };
}
