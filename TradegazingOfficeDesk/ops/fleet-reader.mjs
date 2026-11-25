import { readFileSync, lstatSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { deskHome } from './config.mjs';
import { DeskError } from './contract.mjs';
import { historyBindings, historyIdentity, projectHost } from './fleet-model.mjs';
import { createEventStore, pullEvents, EVENT_LIMITS } from './fleet-events.mjs';
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
      if (b.subtitle !== undefined && (!label(b.subtitle) || !b.subtitle.trim())) throw new Error('Invalid fleet subtitle');
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
  if (!response.ok) { const error=new Error('Reader unavailable'); error.status=response.status; throw error; }
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
export function createReader({fetcher=fetch, clock=Date.now, cache=new Map(), refreshWaitMs=REFRESH_WAIT_MS, events=false, split=false, readToken=path=>{
  const stat=lstatSync(path); if(!stat.isFile() || (stat.mode&0o077))throw new Error('Private token required');
  return readFileSync(path,'utf8').trim();
}}={}) {
  async function read(host, loadJournal) {
    const signature=JSON.stringify(host), now=clock();
    let entry=cache.get(host.id);
    if (!entry || entry.signature!==signature) { entry={signature,value:null,at:0,attempt:null,pending:null,failed:false,events:createEventStore(),eventsPending:null, partAt:{}, partFailed:{}};cache.set(host.id,entry); }
    if(entry.value && now-entry.at>7*86400000)entry.value=null;
    if(split && entry.value) for(const part of ['desk','health']) {
      if(now-entry.partAt[part]>7*86400000) delete entry.value[part];
    }
    async function refresh() {
      entry.attempt=clock();
      try {
        const token=readToken(host.token_file);
        if(!/^[A-Za-z0-9_-]{20,200}$/.test(token))throw new Error('Invalid token');
        if(split) {
          await Promise.all(['desk','health'].map(async part=>{
            try {
              const value=await fetchJson(new URL(`/v1/current?part=${part}`,host.endpoint),token,fetcher);
              if (value.host_id!==host.native_host_id || !Array.isArray(value[part==='desk'?'accounts':'windows'])) {
                throw new Error('Identity/shape mismatch');
              }
              entry.value??={};
              entry.value[part]=value;
              entry.partAt[part]=entry.at=clock();
              entry.partFailed[part]=false;
              entry.first.resolve();
            } catch { entry.partFailed[part]=true; }
          }));
          entry.failed=false;
        } else {
          const [desk,health]=await Promise.all([
            fetchJson(new URL('/v1/desk',host.endpoint),token,fetcher),
            fetchJson(new URL('/v1/health?days=7',host.endpoint),token,fetcher),
          ]);
          if(health.host_id!==host.native_host_id || !Array.isArray(desk.accounts))throw new Error('Identity/shape mismatch');
          entry.value={desk,health};entry.at=clock();entry.failed=false;
        }
      } catch { entry.failed=true; }
      finally { entry.first?.resolve(); entry.pending=null; }
    }
    // Successful reads have no Office TTL: the existing Mac backend already coalesces/caches its pulls.
    // Keeping a second TTL here lets another tab shift the cache phase and miss this tab's next poll.
    if(!entry.pending && (!entry.failed || entry.attempt===null || now-entry.attempt>=30000)) {
      if(split) entry.first=Promise.withResolvers();
      entry.pending=Promise.resolve().then(refresh);
    }
    if(entry.pending) {
      if(!entry.value)await (split?entry.first.promise:entry.pending);
      else await waitBriefly(entry.pending,refreshWaitMs);
    }
    if(events && loadJournal && entry.value?.desk && !entry.eventsPending) {
      // Journal catch-up is requested by fleet detail and runs independently of live figures.
      entry.eventsPending=Promise.resolve().then(()=>{
        const token=readToken(host.token_file);
        const url=after=>new URL(`/v1/events?after=${after}&limit=${EVENT_LIMITS.page}`,host.endpoint);
        return pullEvents(entry.events,after=>fetchJson(url(after),token,fetcher),clock);
      }).catch(()=>{entry.events.failed=true;}).finally(()=>{entry.eventsPending=null;});
    }
    return {host:projectHost(host,entry.value,clock(),{failed:entry.failed, split,
      deskFailed:entry.partFailed.desk, healthFailed:entry.partFailed.health},entry.events),refreshing:entry.pending!==null};
  }
  return async (hosts,loadJournal=true)=>{
    const results=await Promise.all(hosts.map(host=>read(host,loadJournal)));
    return {mode:'NATIVE',...(split ? {splitHistory:true} : {}),asOf:new Date(clock()).toISOString(),hosts:results.map(r=>r.host),refreshing:results.some(r=>r.refreshing)};
  };
}
const reader=createReader({cache:entries, events:true, split:true});
export const fleetOverview = (loadJournal) => reader(loadSources(),loadJournal);

export async function fleetHistory(id, hours, after, clientIdentity) {
  const host=loadSources().find(h=>h.id===id);
  if(!host) throw new DeskError('VPS ist nicht gebunden.',404);
  const stat=lstatSync(host.token_file);
  if(!stat.isFile() || (stat.mode&0o077))throw new DeskError('Historienzugang nicht verfügbar.',503);
  const token=readFileSync(host.token_file,'utf8').trim();
  if(!/^[A-Za-z0-9_-]{20,200}$/.test(token))throw new DeskError('Historienzugang nicht verfügbar.',503);
  const entry=entries.get(host.id);
  const accounts=entry?.signature===JSON.stringify(host)?entry.value?.desk?.accounts:undefined;
  // Freeze the mapping before asking for an upstream revision. A concurrent overview
  // refresh cannot change which deployment this reply and its cursor describe.
  const bindings=historyBindings(host,accounts);
  const identity=historyIdentity(bindings);
  const query=new URLSearchParams({hours:String(hours)});
  if(after && clientIdentity===identity) query.set('after',after);
  let payload;
  try {
    payload=await fetchJson(new URL('/v1/history?'+query,host.endpoint),token,fetch);
  } catch {
    throw new DeskError('Historie momentan nicht erreichbar.',503);
  }
  if (payload.host_id!==host.native_host_id || typeof payload.reset!=='boolean' || (!query.has('after') && !payload.reset) ||
      !/^[0-9a-f]{32}$/.test(payload.cursor) || !Array.isArray(payload.equity) || !Array.isArray(payload.health)) {
    throw new DeskError('Historie passt nicht zur gebundenen Quelle.',503);
  }
  const equity=[];
  for (const [scope,slot,point] of payload.equity) {
    const [account_key,environment,run_id,deployment_id]=scope;
    for (const binding of bindings) {
      if (account_key===binding.account_key && environment===binding.environment &&
          run_id===(binding.run_id??null) && deployment_id===binding.nativeDeployment) {
        equity.push([`${host.id}.${binding.id}`,slot,point]);
      }
    }
  }
  return {identity,cursor:payload.cursor,reset:payload.reset,equity,health:payload.health};
}
