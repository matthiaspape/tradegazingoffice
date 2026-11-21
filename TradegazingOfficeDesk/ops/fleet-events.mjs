// Incremental M650 event journal (/v1/events), read server-side with the host token.
// Only desk-relevant originals are kept, bounded per host and limited to the reader's
// seven-day retention. The M650 correction contract applies as in projection.corrected():
// explicit supersession, and VERSIONED_BY_PAYLOAD_HASH versions keyed by logical_record_id.
export const EVENT_LIMITS = Object.freeze({ deals: 10000, incidents: 2000, heartbeats: 64, superseded: 20000,
  pages: 20, page: 1000, retentionMs: 7 * 86400000, failuresBeforeReread: 3 });

const scopeKey = r => JSON.stringify([r?.account_key ?? null, r?.environment ?? null, r?.run_id ?? null]);
const deploymentKey = r => JSON.stringify([r?.account_key ?? null, r?.environment ?? null, r?.run_id ?? null, r?.deployment_id ?? null]);
const CURSOR = /^\d{1,19}$/;
const cursorValue = value => typeof value === 'string' && CURSOR.test(value) && BigInt(value) < 2n ** 63n ? BigInt(value) : null;

function emptyJournal() {
  return { cursor: '0', deals: new Map(), incidents: new Map(), heartbeats: new Map(), superseded: new Map(), pulledAt: null, complete: false };
}
const staged = j => ({ ...j, deals: new Map(j.deals), incidents: new Map(j.incidents), heartbeats: new Map(j.heartbeats), superseded: new Map(j.superseded) });
// journal: accepted state shown by the desk; recovery: a reread from cursor 0 in progress.
export function createEventStore() {
  return { journal: emptyJournal(), recovery: null, failed: false, failures: 0, lastError: null };
}

// Keeps the newest entries by exact cursor order.
function trim(map, limit) {
  if (map.size <= limit) return;
  const sorted = [...map.entries()].sort((a, b) => (a[1].cursor < b[1].cursor ? -1 : a[1].cursor > b[1].cursor ? 1 : 0));
  for (const [key] of sorted.slice(0, map.size - limit)) map.delete(key);
}
function put(map, key, entry) {
  const old = map.get(key);
  if (!old || old.cursor < entry.cursor) map.set(key, entry);
}

export function ingest(journal, observations) {
  for (const o of Array.isArray(observations) ? observations : []) {
    const row = o?.original, cursor = cursorValue(o?.cursor);
    if (!row || typeof row !== 'object' || cursor === null || typeof row.record_id !== 'string' || typeof row.record_type !== 'string') continue;
    const scope = scopeKey(row), entry = { cursor, row, scope, deployment: deploymentKey(row) };
    // Superseded originals are removed when the correction arrives and refused if they arrive later.
    if (typeof row.supersedes_record_id === 'string') {
      const target = `${scope}|${row.supersedes_record_id}`;
      put(journal.superseded, target, entry);
      for (const map of [journal.deals, journal.incidents])
        for (const [key, old] of map) if (`${old.scope}|${old.row.record_id}` === target) map.delete(key);
    }
    if (journal.superseded.has(`${scope}|${row.record_id}`)) continue;
    const logical = row.quality?.correction_policy === 'VERSIONED_BY_PAYLOAD_HASH' && typeof row.payload?.logical_record_id === 'string'
      ? row.payload.logical_record_id : row.record_id;
    const key = `${scope}|${row.record_type}|${logical}`;
    if (row.record_type === 'deal_event') put(journal.deals, key, entry);
    else if (row.record_type === 'incident_event') put(journal.incidents, key, entry);
    else if (row.record_type === 'telemetry_health' && typeof row.payload?.source_state === 'string') put(journal.heartbeats, entry.deployment, entry);
  }
  trim(journal.deals, EVENT_LIMITS.deals);
  trim(journal.incidents, EVENT_LIMITS.incidents);
  trim(journal.heartbeats, EVENT_LIMITS.heartbeats);
  trim(journal.superseded, EVENT_LIMITS.superseded);
}

// Reads pages while the cursor advances, within one shared request budget.
async function read(journal, fetchPage, budget) {
  while (budget.left > 0) {
    budget.left--;
    const data = await fetchPage(journal.cursor);
    const next = cursorValue(String(data?.next_cursor ?? ''));
    if (!Array.isArray(data?.observations) || next === null) throw new Error('Invalid events payload');
    ingest(journal, data.observations);
    if (next <= BigInt(journal.cursor)) return true;
    journal.cursor = next.toString();
  }
  return false;
}

// Incremental pages are staged on a copy that becomes the accepted journal only when the
// pull succeeds; a failure leaves the accepted journal and its pull time unchanged. A pull
// that uses its whole budget is accepted as incomplete (complete=false) and continues next
// time. An expired cursor (HTTP 410) or repeated failures start a reread from cursor 0 in a
// separate recovery journal, kept across refreshes, that replaces the accepted journal only
// once it has reached the end of the stream.
export async function pullEvents(store, fetchPage, clock = Date.now) {
  const budget = { left: EVENT_LIMITS.pages };
  if (!store.recovery) {
    const next = staged(store.journal);
    try {
      next.complete = await read(next, fetchPage, budget);
      next.pulledAt = clock();
      store.journal = next;
      store.failed = false; store.failures = 0; store.lastError = null;
      return;
    } catch (error) {
      store.failed = true; store.failures++; store.lastError = clock();
      if (store.journal.cursor === '0' || (error?.status !== 410 && store.failures < EVENT_LIMITS.failuresBeforeReread)) throw error;
      store.recovery = emptyJournal();
      if (budget.left <= 0) return;
    }
  }
  try {
    if (!await read(store.recovery, fetchPage, budget)) return;
  } catch (error) { store.lastError = clock(); throw error; }
  store.recovery.complete = true;
  store.recovery.pulledAt = clock();
  store.journal = store.recovery; store.recovery = null;
  store.failed = false; store.failures = 0; store.lastError = null;
}

export function scopedEvents(store, binding, now = Date.now()) {
  const journal = store?.journal;
  const scope = scopeKey(binding), deployment = deploymentKey(binding);
  const live = e => {
    const at = Date.parse(e.row.observed_at_utc);
    return Number.isFinite(at) && at >= now - EVENT_LIMITS.retentionMs && !journal.superseded.has(`${e.scope}|${e.row.record_id}`);
  };
  const pick = map => journal ? [...map.values()].filter(e => e.deployment === deployment && e.scope === scope && live(e)).map(e => e.row) : [];
  const heartbeat = journal?.heartbeats.get(deployment);
  return {
    deals: pick(journal?.deals ?? new Map()), incidents: pick(journal?.incidents ?? new Map()),
    health: heartbeat && live(heartbeat) ? heartbeat.row : null,
    state: journal?.pulledAt ? (store.failed ? 'STALE' : journal.complete ? 'AVAILABLE' : 'PARTIAL') : (store?.failed ? 'FAILED' : 'LOADING'),
    pulledAt: journal?.pulledAt ? new Date(journal.pulledAt).toISOString() : null,
  };
}
