import { readFileSync, lstatSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { deskHome } from './config.mjs';
import { DeskError } from './contract.mjs';
import { projectHost } from './fleet-model.mjs';
import { REFRESH_WAIT_MS } from './fleet-timing.mjs';

const entries = new Map();
export const sourceFile = () => resolve(deskHome(), 'fleet-sources.json');
export function privateJson(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || (stat.mode & 0o077)) throw new Error('Private regular file required');
  return JSON.parse(readFileSync(path, 'utf8'));
}
export function validateSources(value) {
  const slug = s => typeof s === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(s);
  const label = s => typeof s === 'string' && s.length > 0 && s.length <= 200;
  if (value?.version !== 1 || !Array.isArray(value.hosts) || value.hosts.length > 16) throw new Error('Invalid sources');
  const ids = new Set(), nativeIds = new Set();
  for (const h of value.hosts) {
    if (!slug(h.id) || ids.has(h.id) || !label(h.name) || !label(h.native_host_id) || nativeIds.has(h.native_host_id)) throw new Error('Invalid host binding');
    ids.add(h.id); nativeIds.add(h.native_host_id);
    const url = new URL(h.endpoint);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Loopback endpoint required');
    if (!isAbsolute(h.token_file) || (h.ip && !label(h.ip)) || !Number.isInteger(h.fresh_seconds) || h.fresh_seconds < 600 || h.fresh_seconds > 3600 || !Array.isArray(h.bindings) || h.bindings.length > 100) throw new Error('Invalid host settings');
    const bindings = new Set();
    for (const b of h.bindings) {
      if (!slug(b.id) || bindings.has(b.id) || !label(b.name) || !label(b.broker) || !label(b.account_key) || !label(b.deployment_id) || !['LIVE','DEMO','RESEARCH'].includes(b.environment) || (b.environment === 'RESEARCH' && !label(b.run_id))) throw new Error('Invalid fleet binding');
      bindings.add(b.id);
    }
  }
  return value.hosts;
}
export function loadSources() {
  try { return validateSources(privateJson(sourceFile())); }
  catch (error) { if (error.code === 'ENOENT') return []; throw new DeskError('Fleet-Quellenkonfiguration ist ungültig oder nicht geschützt.', 503); }
}
export async function fetchJson(url, token, fetcher) {
  const response = await fetcher(url, {headers:{Authorization:`Bearer ${token}`}, redirect:'error', signal:AbortSignal.timeout(45000)});
  if (!response.ok) throw new Error('Reader unavailable');
  const reader = response.body.getReader();
  const chunks=[]; let size=0;
  try {
    while (true) { const part=await reader.read(); if(part.done)break; size+=part.value.length;
      if(size>16*1024**2)throw new Error('Reader response too large'); chunks.push(part.value); }
  } catch(error) { await reader.cancel(); throw error; }
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid reader payload');
  return data;
}
async function waitBriefly(pending, milliseconds) {
  let timer;
  try { await Promise.race([pending,new Promise(resolve=>{timer=setTimeout(resolve,milliseconds);})]); }
  finally { clearTimeout(timer); }
}
export function createReader({fetcher=fetch, clock=Date.now, cache=new Map(), refreshWaitMs=REFRESH_WAIT_MS, readToken=path=>{
  const stat=lstatSync(path); if(!stat.isFile() || (stat.mode&0o077))throw new Error('Private token required');
  return readFileSync(path,'utf8').trim();
}}={}) {
  async function read(host) {
    const signature=JSON.stringify(host), now=clock();
    let entry=cache.get(host.id);
    if (!entry || entry.signature!==signature) { entry={signature,value:null,at:0,attempt:null,pending:null,failed:false};cache.set(host.id,entry); }
    if(entry.value && now-entry.at>7*86400000)entry.value=null;
    async function refresh() {
      entry.attempt=clock();
      try {
        const token=readToken(host.token_file);
        if(!/^[A-Za-z0-9_-]{20,200}$/.test(token))throw new Error('Invalid token');
        const [desk,health]=await Promise.all([
          fetchJson(new URL('/v1/desk',host.endpoint),token,fetcher),
          fetchJson(new URL('/v1/health?days=7',host.endpoint),token,fetcher),
        ]);
        if(health.host_id!==host.native_host_id || !Array.isArray(desk.accounts))throw new Error('Identity/shape mismatch');
        entry.value={desk,health};entry.at=clock();entry.failed=false;
      } catch { entry.failed=true; }
      finally { entry.pending=null; }
    }
    // Successful reads have no Office TTL: the existing Mac backend already coalesces/caches its pulls.
    // Keeping a second TTL here lets another tab shift the cache phase and miss this tab's next poll.
    if(!entry.pending && (!entry.failed || entry.attempt===null || now-entry.attempt>=30000)) {
      entry.pending=Promise.resolve().then(refresh);
    }
    if(entry.pending) {
      if(!entry.value)await entry.pending;
      else await waitBriefly(entry.pending,refreshWaitMs);
    }
    return {host:projectHost(host,entry.value,clock(),{failed:entry.failed}),refreshing:entry.pending!==null};
  }
  return async hosts=>{
    const results=await Promise.all(hosts.map(read));
    return {mode:'NATIVE',asOf:new Date(clock()).toISOString(),hosts:results.map(r=>r.host),refreshing:results.some(r=>r.refreshing)};
  };
}
const reader=createReader({cache:entries});
export const fleetOverview = () => reader(loadSources());
