// M650 read-model adapter. Money stays a decimal string; sums and differences use exact
// fixed-point arithmetic (12 places), never floating point.
import { HEALTH_FRESH_SECONDS, ACCOUNT_FRESH_SECONDS } from './fleet-timing.mjs';
import { scopedEvents } from './fleet-events.mjs';
export const items = value => Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
const text = value => typeof value === 'string' ? value.slice(0, 500) : '';
const numeric = value => value !== null && value !== '' && ['number','string'].includes(typeof value) && Number.isFinite(Number(value)) ? Number(value) : null;
export const decimal = value => typeof value === 'string' && /^-?\d{1,24}(?:\.\d{1,12})?$/.test(value) ? value : null;
const SCALE = 10n ** 12n;
function fixed(value) {
  const v = decimal(value); if (v === null) return null;
  const negative = v.startsWith('-'), [whole, fraction = ''] = v.replace('-', '').split('.');
  const n = BigInt(whole) * SCALE + BigInt((fraction + '0'.repeat(12)).slice(0, 12));
  return negative ? -n : n;
}
function plain(n) {
  if (n === null) return null;
  const negative = n < 0n, a = negative ? -n : n;
  const fraction = (a % SCALE).toString().padStart(12, '0').replace(/0+$/, '');
  return `${negative && a !== 0n ? '-' : ''}${a / SCALE}${fraction ? '.' + fraction : ''}`;
}
export function sum(values) {
  let total = 0n;
  for (const v of values) { const n = fixed(v); if (n === null) return null; total += n; }
  return plain(total);
}
export const difference = (a, b) => { const x = fixed(a), y = fixed(b); return x === null || y === null ? null : plain(x - y); };
// Native MT5 doubles arrive as %.17g text (e.g. "0.029999999999999999"); round to 8 places.
export function nativeDecimal(value) {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) >= 1e15) return null;
  return decimal(n.toFixed(8).replace(/\.?0+$/, '').replace(/^-0$/, '0'));
}
const brokerStamp = value => {
  const n = numeric(value), date = n !== null && n > 0 ? new Date(n) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString().replace('Z', '') : null;
};
// Closed hedging cycles from native deal events: entries (0) against exits (1, 3) of one
// position. Only for an evidenced HEDGING account; any other deal of a position (reversal,
// unknown entry or side, missing volume) disqualifies that position instead of being skipped.
export function positionHistory(deals, positionMode = 'HEDGING') {
  if (positionMode !== 'HEDGING') return [];
  const groups = new Map(), invalid = new Set();
  for (const r of deals) {
    const p = r.payload ?? {};
    if (typeof p.position_id !== 'string') continue;
    if (!nativeDecimal(p.volume) || ![0, 1].includes(p.type) || ![0, 1, 3].includes(p.entry)) { invalid.add(p.position_id); continue; }
    if (!groups.has(p.position_id)) groups.set(p.position_id, []);
    groups.get(p.position_id).push(p);
  }
  for (const id of invalid) groups.delete(id);
  const rows = [];
  for (const [id, list] of groups) {
    list.sort((a, b) => (numeric(a.broker_time_msc) ?? 0) - (numeric(b.broker_time_msc) ?? 0));
    const ins = list.filter(p => p.entry === 0), outs = list.filter(p => p.entry !== 0);
    const vol = rows => sum(rows.map(p => nativeDecimal(p.volume)));
    if (!ins.length || !outs.length || vol(ins) === null || vol(ins) !== vol(outs)) continue;
    // Every monetary component must be evidenced; a missing one leaves the net unknown.
    const costs = list.flatMap(p => [p.profit, p.commission, p.swap, p.fee].map(nativeDecimal));
    rows.push({ id, symbol: text(ins[0].symbol), side: ins[0].type === 0 ? 'BUY' : 'SELL', volume: vol(ins),
      openedAt: brokerStamp(ins[0].broker_time_msc), closedAt: brokerStamp(outs.at(-1).broker_time_msc),
      openPrice: nativeDecimal(ins[0].price), closePrice: nativeDecimal(outs.at(-1).price),
      net: costs.includes(null) ? null : sum(costs), revision: text(ins[0].owner?.revision) });
  }
  return rows.sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? '')).slice(0, 500);
}
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
export function fleetModel(binding, accounts, host, now, offline, store) {
  const matches = items(accounts).filter(a => accountMatch(a, binding));
  const a = matches.length === 1 ? matches[0] : null;
  const freshSeconds = Math.max(host.fresh_seconds, ACCOUNT_FRESH_SECONDS);
  const state = freshness(a?.observed_at, now, freshSeconds);
  const series = items(a?.series).filter(p => epoch(p.at) !== null && epoch(p.at) <= now && epoch(p.at) >= now - 7 * 86400000 && decimal(p.value) !== null)
    .map(p => ({at:p.at, value:p.value})).sort((a,b)=>epoch(a.at)-epoch(b.at));
  const payload = a?.account ?? {};
  const events = scopedEvents(store, binding, now);
  const sourceState = text(events.health?.payload?.source_state);
  const healthCurrent = freshness(events.health?.observed_at_utc, now, freshSeconds) === 'CURRENT';
  return {
    id: `${host.id}.${binding.id}`, hostId: host.id, name: binding.name, broker: binding.broker,
    subtitle: binding.subtitle?.trim(),
    deploymentId: binding.deployment_id, environment: binding.environment, currency: text(payload.currency),
    observedAt: a?.observed_at ?? null, freshSeconds, state: offline && state === 'CURRENT' ? 'STALE' : state,
    sharedAccount: host.bindings.filter(b => b.account_key === binding.account_key && b.environment === binding.environment && (b.run_id ?? null) === (binding.run_id ?? null)).length > 1,
    balance: decimal(payload.balance), equity: decimal(payload.equity), series,
    // Day base and floating result are the EA's native values (V10.3+); status is its own heartbeat state.
    profitToday: difference(nativeDecimal(payload.equity), nativeDecimal(payload.day_start_equity)), unrealized: nativeDecimal(payload.profit),
    status: sourceState && healthCurrent ? sourceState : 'Unbekannt',
    reasons: [...(matches.length > 1 ? ['Widersprüchliche Kontobindung'] : !a ? ['Noch keine passende EA-Exportquelle'] : []),
      ...(a && nativeDecimal(payload.day_start_equity) === null ? ['Tagesbasis vom EA noch nicht gemeldet (ab NOVA V10.3)'] : []),
      ...(events.state === 'FAILED' ? ['Ereignisabruf fehlgeschlagen; noch kein Ereignisjournal empfangen'] : []),
      ...(events.state === 'STALE' ? ['Ereignisabruf fehlgeschlagen; Historie und Issues zeigen den zuletzt empfangenen Stand'] : []),
      ...(a?.attention ? items(a.attention).filter(v=>typeof v==='string').map(text) : [])],
    positionMode: text(a?.position_mode),
    variants: items(a?.variants).map(r=>({symbol:text(r.payload?.symbol),timeframe:numeric(r.payload?.timeframe_minutes),pool:text(r.payload?.pool),revision:text(r.payload?.revision),ready:typeof r.payload?.ready==='boolean'?r.payload.ready:null})),
    pools: items(a?.pools).map(r=>({name:text(r.payload?.pool),used:decimal(r.payload?.used?.risk),capacity:decimal(r.payload?.capacity?.risk)})),
    positions: items(a?.positions).map(r=>({symbol:text(r.payload?.symbol),id:text(r.payload?.position_id),side:text(r.payload?.side),volume:decimal(r.payload?.volume),
      openPrice:decimal(r.payload?.price_open),currentPrice:decimal(r.payload?.price_current),sl:decimal(r.payload?.sl),tp:decimal(r.payload?.tp),
      profit:decimal(r.payload?.profit),swap:decimal(r.payload?.swap),stopRisk:decimal(r.payload?.stop_risk),
      owner:text(r.payload?.owner?.status),revision:text(r.payload?.owner?.revision)})),
    eventsState: events.state, eventsPulledAt: events.pulledAt,
    history: positionHistory(events.deals, text(a?.position_mode)),
    issues: events.incidents.map(r=>({at:r.observed_at_utc??null,severity:text(r.payload?.severity),code:text(r.payload?.code),symbol:text(r.payload?.symbol),
      member:numeric(r.payload?.member),detail:text(r.payload?.detail),repeats:numeric(r.payload?.suppressed_repeats)}))
      .sort((x,y)=>(epoch(y.at)??0)-(epoch(x.at)??0)).slice(0,200),
  };
}
export function projectHost(host, bundle, now, transport = {}, store = null) {
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
    fleets: host.bindings.map(b => fleetModel(b, valid ? bundle?.desk?.accounts : [], host, now, offline, valid ? store : null)),
    issue: !valid ? 'Noch keine erreichbare, passend gebundene Hostquelle' : transport.failed ? 'Backendabruf fehlgeschlagen. Letzter empfangener Stand mit Originalzeiten.' : null,
  };
}
