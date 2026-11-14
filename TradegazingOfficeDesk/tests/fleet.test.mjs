import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {healthModel,projectHost,decimal} from '../ops/fleet-model.mjs';
import {createReader,validateSources,fetchJson} from '../ops/fleet-reader.mjs';
import {connectFleet} from '../ops/connect-fleet.mjs';
import {credentials} from '../ops/auth.mjs';
import {GET} from '../app/api/fleet-control/overview/route.ts';

const root=mkdtempSync(resolve(tmpdir(),'office-fleet-'));
process.env.TRADEGAZING_OFFICE_DESK_HOME=resolve(root,'desk');
after(()=>rmSync(root,{recursive:true,force:true}));
const now=Date.parse('2026-11-14T12:00:00Z'),at=n=>new Date(now+n*1000).toISOString();
const host={id:'primary',native_host_id:'test-vps',name:'Test VPS',ip:'192.0.2.10',endpoint:'http://127.0.0.1:8766/',token_file:'/private/example',fresh_seconds:900,bindings:[]};
const window=(seconds,cpu=40)=>({slot:Math.floor((now+seconds*1000)/300000)*300,session:'old',samples:12,cpu_samples:11,expected_samples:20,cpu_mean:cpu,cpu_max:cpu+5,last:{observed_at:at(seconds),available:true,total_ram:'1000',available_ram:400,volumes:[{name:'C:',size:'2000',free:'500'}],processes:[]}});
const bundle=()=>({desk:{accounts:[],source_binding_status:'WAITING_FOR_EA_EXPORTS'},health:{host_id:'test-vps',windows:[window(-10)],attention:[]}});
const binding={id:'nova',name:'Nova',broker:'Example Broker',account_key:'broker/server/account',deployment_id:'dep1',environment:'DEMO'};
const privateWrite=(file,value)=>writeFileSync(file,JSON.stringify(value),{mode:0o600});

test('health chooses newest observation per slot across sessions; end values use own sample denominators',()=>{
 const older=window(-50,20),newer=window(-10,70);older.session='zzz';newer.session='aaa';
 const model=healthModel({windows:[newer,older,window(900,99)]},now);
 assert.equal(model.cpu,70);assert.equal(model.series.length,1);assert.equal(model.ram.percent,60);assert.equal(model.volumes[0].percent,75);
 assert.equal(model.observedAt,at(-10));assert.equal(model.cpuSamples,11);
});
test('invalid/future/expired health cannot become current and missing numeric fields never become zero',()=>{
 const w=window(-10);w.last.available_ram=null;w.last.volumes[0].free='3000';
 const model=healthModel({windows:[w,window(-8*86400)]},now);
 assert.equal(model.ram.percent,null);assert.equal(model.volumes[0].percent,null);assert.equal(model.series.length,1);
 assert.equal(healthModel({windows:[window(600)]},now).state,'UNKNOWN');
});
test('real EA-less and identity conflict preserve host card without fabricating fleets',()=>{
 const m=projectHost(host,bundle(),now);
 assert.equal(m.waitingForEa,true);assert.deepEqual(m.fleets,[]);assert.equal(m.cpu,40);
 const wrong=bundle();wrong.health.host_id='wrong-vps';wrong.desk.accounts=[{account_key:'other'}];
 const bad=projectHost(host,wrong,now);assert.equal(bad.connection,'UNAVAILABLE');assert.equal(bad.cpu,null);
});
test('registered scope only, exact money, shared account label and unknown qualified trading values',()=>{
 const b=bundle();b.desk.accounts=[{account_key:binding.account_key,environment:'DEMO',deployment_id:'dep1',observed_at:at(-800),position_mode:'HEDGING',account:{balance:'9007199254740993.01',equity:'9007199254740993.02',currency:'EUR'},series:[{at:at(-800),value:'9007199254740993.02'}]}];
 const h={...host,bindings:[binding,{...binding,id:'vega'}]};
 const m=projectHost(h,b,now);assert.equal(m.fleets[0].balance,'9007199254740993.01');assert.equal(m.fleets[0].state,'CURRENT');assert.equal(m.fleets[0].freshSeconds,900);
 assert.equal(m.fleets[0].sharedAccount,true);assert.equal(m.fleets[0].status,'Unbekannt');assert.equal(m.fleets[0].profitToday,null);assert.equal(m.fleets[0].unrealized,null);
 b.desk.accounts[0].environment='LIVE';assert.equal(projectHost(h,b,now).fleets[0].balance,null);
 assert.equal(decimal(10),null);assert.equal(decimal('1e10'),null);
});
test('source registry rejects remote/credential URLs, duplicate identities and unscoped research',()=>{
 assert.equal(validateSources({version:1,hosts:[host]}).length,1);
 for(const patch of [{endpoint:'http://example.com/'},{endpoint:'http://user:secret@127.0.0.1:8766/'},{fresh_seconds:20},{bindings:[{...binding,environment:'RESEARCH'}]}])assert.throws(()=>validateSources({version:1,hosts:[{...host,...patch}]}));
 assert.throws(()=>validateSources({version:1,hosts:[host,{...host,id:'second'}]}));
});
test('reader coalesces concurrent initial loads and keeps credentials out of its public model',async()=>{
 let calls=0;const token='fake-test-key-does-not-authorize-anywhere';
 const reader=createReader({clock:()=>now,readToken:()=>token,fetcher:async(url,options)=>{calls++;assert.equal(options.headers.Authorization,`Bearer ${token}`);return Response.json(String(url).includes('health')?bundle().health:bundle().desk);}});
 const [a,b]=await Promise.all([reader([host]),reader([host])]);
 assert.equal(calls,2);assert.equal(a.hosts[0].cpu,40);assert.deepEqual(a,b);assert(!JSON.stringify(a).includes(token));assert(!JSON.stringify(a).includes(host.token_file));
});
test('cached response returns during blocked refresh and survives backend loss with original times',async()=>{
 let clock=now,fail=false,gate=null;
 const reader=createReader({clock:()=>clock,readToken:()=> 'fake-test-key-does-not-authorize-anywhere',fetcher:async url=>{if(gate)await gate;if(fail)throw new Error('test backend down');return Response.json(String(url).includes('health')?bundle().health:bundle().desk);}});
 await reader([host]);clock+=301000;
 let unblock;gate=new Promise(r=>{unblock=r;});
 const response=await reader([host]);assert.equal(response.hosts[0].observedAt,at(-10));unblock();gate=null;
 await new Promise(r=>setImmediate(r));clock+=301000;fail=true;
 await reader([host]);await new Promise(r=>setImmediate(r));
 const stale=await reader([host]);assert.equal(stale.hosts[0].connection,'STALE');assert.equal(stale.hosts[0].observedAt,at(-10));
 clock+=8*86400000;const expired=await reader([host]);assert.equal(expired.hosts[0].cpu,null);
});
test('one failing host does not hide an independently available host',async()=>{
 const second={...host,id:'second',native_host_id:'second-vps',endpoint:'http://127.0.0.1:8767/'};
 const reader=createReader({clock:()=>now,readToken:()=> 'fake-test-key-does-not-authorize-anywhere',fetcher:async url=>{if(String(url).includes(':8766'))throw new Error();return Response.json(String(url).includes('health')?{...bundle().health,host_id:'second-vps'}:bundle().desk);}});
 const result=await reader([host,second]);assert.equal(result.hosts[0].connection,'UNAVAILABLE');assert.equal(result.hosts[1].cpu,40);
});
test('reader does not follow redirects or accept oversized payloads',async()=>{
 await assert.rejects(fetchJson('http://127.0.0.1:1','fake',async(_url,opt)=>{assert.equal(opt.redirect,'error');return new Response('',{status:302});}));
 await assert.rejects(fetchJson('http://127.0.0.1:1','fake',async()=>new Response('x'.repeat(16*1024**2+1))));
});
test('native API requires Office auth and rejects caller-supplied source selection',async()=>{
 execFileSync(process.execPath,['ops/setup.mjs'],{cwd:resolve(import.meta.dirname,'..'),env:process.env,stdio:'pipe'});
 const request=(query='',auth=false)=>new Request(`http://127.0.0.1:43120/api/fleet-control/overview${query}`,{headers:{host:'127.0.0.1:43120',...(auth?{authorization:`Bearer ${credentials().token}`}:{})}});
 assert.equal((await GET(request())).status,401);
 const empty=await GET(request('',true));assert.equal(empty.status,200);assert.deepEqual((await empty.json()).hosts,[]);
 assert.equal((await GET(request('?source=http://evil.example',true))).status,400);
 const foreign=new Request('http://127.0.0.1:43120/api/fleet-control/overview',{headers:{host:'127.0.0.1:43120',authorization:`Bearer ${credentials().token}`,origin:'https://evil.example'}});
 assert.equal((await GET(foreign)).status,403);
});
test('connector creates its own reader grant idempotently and preserves revoked access',async()=>{
 const dir=resolve(root,'mac');mkdirSync(dir);
 const devices=resolve(dir,'devices.json'),cfg=resolve(dir,'config.json');
 privateWrite(devices,{devices:[{name:'existing',owner:'Matthias',enabled:true,sha256:'existing-hash'}]});
 privateWrite(cfg,{credentials_file:devices,port:8766});
 const fetcher=async()=>Response.json(bundle().health);
 await connectFleet(cfg,{fetcher,ip:'192.0.2.10'});const before=readFileSync(devices,'utf8');
 await connectFleet(cfg,{fetcher,ip:'192.0.2.10'});assert.equal(readFileSync(devices,'utf8'),before);assert.equal(JSON.parse(before).devices[0].sha256,'existing-hash');
 const value=JSON.parse(before);value.devices[1].enabled=false;privateWrite(devices,value);
 await assert.rejects(connectFleet(cfg,{fetcher,ip:'192.0.2.10'}));assert.equal(JSON.parse(readFileSync(devices,'utf8')).devices[1].enabled,false);
});
