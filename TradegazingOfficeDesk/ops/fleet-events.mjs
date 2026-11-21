// Incremental M650 event journal (/v1/events), read server-side with the host token.
// Only desk-relevant originals are kept, bounded per host. Restarting the Office or an
// expired reader cursor rereads the reader's retained window from cursor 0.
export const EVENT_LIMITS = Object.freeze({ deals: 10000, incidents: 2000, pages: 20, page: 1000 });

const scopeKey = r => JSON.stringify([r?.account_key ?? null, r?.environment ?? null, r?.run_id ?? null]);
export const bindingScope = b => scopeKey(b);

export function createEventStore() {
  return { cursor: '0', deals: new Map(), incidents: new Map(), health: new Map(), failed: false, pulledAt: null };
}

function trim(map, limit) {
  if (map.size <= limit) return;
  const sorted = [...map.entries()].sort((a, b) => a[1].cursor - b[1].cursor);
  for (const [key] of sorted.slice(0, map.size - limit)) map.delete(key);
}

export function ingest(store, observations) {
  for (const o of Array.isArray(observations) ? observations : []) {
    const row = o?.original, cursor = Number(o?.cursor);
    if (!row || typeof row !== 'object' || !Number.isSafeInteger(cursor) || typeof row.record_id !== 'string') continue;
    const entry = { cursor, row, scope: scopeKey(row) };
    if (row.record_type === 'deal_event') store.deals.set(`${entry.scope}|${row.record_id}`, entry);
    else if (row.record_type === 'incident_event') store.incidents.set(`${entry.scope}|${row.record_id}`, entry);
    else if (row.record_type === 'telemetry_health' && typeof row.payload?.source_state === 'string') {
      const old = store.health.get(entry.scope);
      if (!old || old.cursor < cursor) store.health.set(entry.scope, entry);
    }
  }
  trim(store.deals, EVENT_LIMITS.deals);
  trim(store.incidents, EVENT_LIMITS.incidents);
}

// fetchPage(after) resolves to the reader payload {observations,next_cursor}.
export async function pullEvents(store, fetchPage, clock = Date.now) {
  const run = async () => {
    for (let page = 0; page < EVENT_LIMITS.pages; page++) {
      const data = await fetchPage(store.cursor);
      const next = String(data?.next_cursor ?? '');
      if (!Array.isArray(data?.observations) || !/^\d{1,19}$/.test(next)) throw new Error('Invalid events payload');
      ingest(store, data.observations);
      const done = next === store.cursor || data.observations.length < EVENT_LIMITS.page;
      store.cursor = next;
      if (done) return;
    }
  };
  try { await run(); }
  catch (error) {
    // An expired cursor is indistinguishable from other reader errors: reread once from 0.
    if (store.cursor === '0') throw error;
    const fresh = createEventStore();
    Object.assign(store, fresh);
    await run();
  }
  store.failed = false;
  store.pulledAt = clock();
}

export function scopedEvents(store, binding) {
  const scope = bindingScope(binding);
  const own = row => row.deployment_id === binding.deployment_id;
  const pick = map => [...(store?.[map]?.values?.() ?? [])].filter(e => e.scope === scope && own(e.row)).map(e => e.row);
  const health = store?.health?.get(scope)?.row;
  return { deals: pick('deals'), incidents: pick('incidents'), health: health && own(health) ? health : null, failed: store?.failed === true, available: !!store?.pulledAt };
}
