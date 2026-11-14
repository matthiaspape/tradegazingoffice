import test from 'node:test';
import assert from 'node:assert/strict';
import {createReader} from '../ops/fleet-reader.mjs';
import {healthModel,projectHost,freshness} from '../ops/fleet-model.mjs';

const start=Date.parse('2026-11-14T12:00:00Z');
const host={id:'primary',native_host_id:'test-vps',name:'Test',ip:null,endpoint:'http://127.0.0.1:8766/',token_file:'/private/test',fresh_seconds:900,bindings:[]};
function health(at){return {host_id:'test-vps',windows:[{slot:Math.floor(at/300000)*300,session:'test',samples:20,cpu_samples:20,expected_samples:20,cpu_mean:40,cpu_max:45,last:{observed_at:new Date(at).toISOString(),available:true,total_ram:1000,available_ram:400,volumes:[]}}],attention:[]};}
const desk={accounts:[],source_binding_status:'WAITING_FOR_EA_EXPORTS'};
function fixture({age=0,wait=8}={}){
 let now=start,blocked=null,fail=false,calls=0;
 const reader=createReader({clock:()=>now,refreshWaitMs:wait,readToken:()=> 'fake-test-key-does-not-authorize-anywhere',fetcher:async url=>{
  calls++;if(blocked)await blocked;if(fail)throw new Error('test offline');
  return Response.json(String(url).includes('health')?health(now-age*1000):desk);
 }});
 return {reader,advance:ms=>{now+=ms;},block:()=>{let release;blocked=new Promise(r=>{release=r;});return()=>{blocked=null;release();};},offline:()=>{fail=true;},calls:()=>calls,time:()=>now};
}

test('after twenty minutes the first request returns the completed fresh refresh, not yesterday cache',async()=>{
 const f=fixture({age:250});await f.reader([host]);f.advance(20*60000);
 const result=await f.reader([host]);
 assert.equal(result.hosts[0].state,'CURRENT');
 assert.equal(result.hosts[0].observedAt,new Date(f.time()-250000).toISOString());
 assert.equal(f.calls(),4);
});
test('poll slightly below five minutes still refreshes and the healthy chain stays current between polls',async()=>{
 const f=fixture({age:315});
 for(let i=0;i<10;i++){
  const result=await f.reader([host]);
  assert.equal(result.hosts[0].state,'CURRENT');
  // Mac-cache age 300s + collector age 15s; another browser interval must fit the explicit budget.
  assert.equal(healthModel(health(Date.parse(result.hosts[0].observedAt)),f.time()+299000).state,'CURRENT');
  f.advance(299999);
 }
 assert.equal(f.calls(),20);
});
test('slow refresh returns retained original times with pending flag, then the next read catches up',async()=>{
 const f=fixture();await f.reader([host]);f.advance(20*60000);const release=f.block();
 const pending=await f.reader([host]);
 assert.equal(pending.refreshing,true);assert.equal(pending.hosts[0].state,'STALE');
 assert.equal(pending.hosts[0].observedAt,new Date(start).toISOString());
 const parallel=await f.reader([host]);assert.equal(parallel.refreshing,true);assert.equal(f.calls(),4);
 release();await new Promise(r=>setImmediate(r));
 const current=await f.reader([host]);assert.equal(current.hosts[0].state,'CURRENT');assert.equal(current.refreshing,false);
});
test('a failed refresh never makes the old measurement fresh or changes its timestamp',async()=>{
 const f=fixture();await f.reader([host]);f.advance(20*60000);f.offline();
 const result=await f.reader([host]);
 assert.equal(result.hosts[0].state,'STALE');assert.equal(result.hosts[0].connection,'STALE');
 assert.equal(result.hosts[0].observedAt,new Date(start).toISOString());assert.equal(result.refreshing,false);
});
test('account budget covers the export chain while preserving larger configured tolerances',()=>{
 const binding={id:'fleet',name:'Test',broker:'Example',account_key:'scope',deployment_id:'dep',environment:'DEMO'};
 const h={...host,bindings:[binding]};
 const observedAt=new Date(start-615000).toISOString();
 const b={health:health(start-315000),desk:{accounts:[{account_key:'scope',deployment_id:'dep',environment:'DEMO',observed_at:observedAt,account:{balance:'100.00',equity:'101.00',currency:'EUR'}}]}};
 const f=projectHost(h,b,start).fleets[0];
 assert.equal(f.freshSeconds,960);assert.equal(f.state,'CURRENT');
 assert.equal(freshness(f.observedAt,start+299000,f.freshSeconds),'CURRENT');
 assert.equal(freshness(f.observedAt,start+400000,f.freshSeconds),'STALE');
 assert.equal(projectHost({...h,fresh_seconds:1800},b,start).fleets[0].freshSeconds,1800);
 assert.equal(f.observedAt,observedAt);
});
test('two clients with different poll phases stay current until each next poll',async()=>{
 const f=fixture({age:315});
 for(let cycle=0;cycle<10;cycle++){
  const a=await f.reader([host]);
  assert.equal(a.hosts[0].observedAt,new Date(f.time()-315000).toISOString());
  assert.equal(healthModel(health(Date.parse(a.hosts[0].observedAt)),f.time()+299000).state,'CURRENT');
  f.advance(100000);
  const b=await f.reader([host]);
  assert.equal(b.hosts[0].observedAt,new Date(f.time()-315000).toISOString());
  assert.equal(healthModel(health(Date.parse(b.hosts[0].observedAt)),f.time()+299000).state,'CURRENT');
  f.advance(200000);
 }
 assert.equal(f.calls(),40);
});
