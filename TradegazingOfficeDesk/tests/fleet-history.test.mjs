import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createReader} from '../ops/fleet-reader.mjs';
import {applyHistory} from '../app/controlling/fleet-control/useFleetHistory.ts';
import {GET as overviewGET} from '../app/api/fleet-control/overview/route.ts';
import {GET as historyGET} from '../app/api/fleet-control/history/route.ts';

const now=Date.parse('2026-11-25T19:30:00Z');
const at=new Date(now-1000).toISOString();
const binding={id:'nova',name:'NOVA',broker:'Test',account_key:'private-test-account',environment:'DEMO',deployment_id:'dep'};
const host={id:'primary',name:'VPS',native_host_id:'vps',endpoint:'http://127.0.0.1:8766/',token_file:'/private/test',fresh_seconds:960,bindings:[binding]};
const desk={host_id:'vps',accounts:[{account_key:binding.account_key,environment:'DEMO',deployment_id:'dep',observed_at:at,
  heartbeat_at:at,source_state:'RUNNING',account:{balance:'9007199254740993.01',currency:'EUR'}}]};
const health={host_id:'vps',windows:[{slot:Math.floor(Date.parse(at)/300000)*300,samples:1,cpu_mean:12,
  last:{observed_at:at,available:true}}]};
const readerToken='fake-token-for-isolated-test-only';
const cursor='a'.repeat(32), next='b'.repeat(32);
const point={at,value:'9007199254740993.01'};

test('a blocked NOVA read does not delay host current; history and journal stay out of the poll',async()=>{
  const paths=[];
  let resolveDesk;
  const delayed=new Promise(resolve=>{resolveDesk=resolve;});
  const reader=createReader({split:true,events:true,clock:()=>now,readToken:()=>readerToken,fetcher:async url=>{
    paths.push(url.pathname+url.search);
    return url.searchParams.get('part')==='desk'?delayed:Response.json(health);
  }});
  const first=await reader([host],false);
  assert.equal(first.splitHistory,true);
  assert.equal(first.refreshing,true);
  assert.equal(first.hosts[0].state,'CURRENT');
  assert.equal(first.hosts[0].fleets[0].state,'UNKNOWN');
  assert.deepEqual(paths.sort(),['/v1/current?part=desk','/v1/current?part=health']);
  resolveDesk(Response.json(desk));
  const settled=await reader([host],false);
  assert.equal(settled.hosts[0].fleets[0].balance,point.value);
  assert.equal(settled.hosts[0].fleets[0].status,'RUNNING');
});

test('one source losing transport keeps only that source stale',async()=>{
  let fail=false;
  const reader=createReader({split:true,clock:()=>now,readToken:()=>readerToken,fetcher:async url=>{
    const part=url.searchParams.get('part');
    if(fail&&part==='health')throw new Error('health transport failed');
    return Response.json(part==='desk'?desk:health);
  }});
  await reader([host],false);
  await reader([host],false);
  fail=true;
  const [entry]=(await reader([host],false)).hosts;
  assert.equal(entry.state,'STALE');
  assert.equal(entry.fleets[0].state,'CURRENT');
  assert.equal(entry.deskConnection,'CURRENT');
});

test('Office History forwards only bounded registered requests and maps delta scope',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'fleet-history-office-'));
  const previous=process.env.TRADEGAZING_OFFICE_DESK_HOME;
  process.env.TRADEGAZING_OFFICE_DESK_HOME=dir;
  t.after(()=>{
    if(previous===undefined)delete process.env.TRADEGAZING_OFFICE_DESK_HOME;
    else process.env.TRADEGAZING_OFFICE_DESK_HOME=previous;
    rmSync(dir,{recursive:true,force:true});
  });
  const seen=[];
  let deployment='dep';
  const nextPoint={...point,value:'1002'};
  const upstream=createServer((request,response)=>{
    assert.equal(request.headers.authorization,`Bearer ${readerToken}`);
    const url=new URL(request.url,'http://127.0.0.1');
    response.setHeader('Content-Type','application/json');
    if(url.pathname==='/v1/current'){
      const value=url.searchParams.get('part')==='health'?health:{...desk,accounts:[{
        ...desk.accounts[0],deployment_id:deployment,fleet:[{deployment_id:'dep'}]
      }]};
      response.end(JSON.stringify(value));return;
    }
    seen.push(url.href);
    response.end(JSON.stringify({host_id:'vps',cursor:next,reset:!url.searchParams.has('after'),
      equity:[[[binding.account_key,'DEMO',null,'dep'],1,point],[[binding.account_key,'DEMO',null,'dep-v2'],1,nextPoint],
        [['other-private-account','DEMO',null,'dep'],1,point]],
      health:[[1,null]]}));
  });
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>upstream.close(resolve)));
  const officeToken='a'.repeat(64);
  const token_file=join(dir,'host-token');
  writeFileSync(token_file,readerToken,{mode:0o600});
  writeFileSync(join(dir,'local-auth.json'),JSON.stringify({token:officeToken}),{mode:0o600});
  writeFileSync(join(dir,'fleet-sources.json'),JSON.stringify({version:1,hosts:[{
    ...host,token_file,endpoint:`http://127.0.0.1:${upstream.address().port}/`
  }]}),{mode:0o600});
  const call=(query,auth=true)=>historyGET(new Request('http://127.0.0.1:43120/api/fleet-control/history?'+query,
    {headers:{host:'127.0.0.1:43120',...(auth?{authorization:'Bearer '+officeToken}:{})}}));
  assert.equal((await call('host=primary&hours=24',false)).status,401);
  assert.equal((await call('host=primary&hours=25')).status,400);
  assert.equal((await call('host=primary&host=other&hours=24')).status,400);
  assert.equal((await call('host=unknown&hours=24')).status,404);
  assert.equal(seen.length,0);
  const baseline=await call('host=primary&hours=24');
  assert.equal(baseline.status,200);
  const initial=await baseline.json();
  assert.match(initial.identity,/^[0-9a-f]{64}$/);
  assert.deepEqual(initial,{identity:initial.identity,cursor:next,reset:true,equity:[['primary.nova',1,point]],health:[[1,null]]});
  assert.equal((await call('host=primary&hours=24&after='+cursor)).status,400);
  const diffQuery='host=primary&hours=24&after='+cursor+'&identity='+initial.identity;
  const delta=await call(diffQuery);
  assert.equal((await delta.json()).reset,false);
  assert(seen[1].endsWith('hours=24&after='+cursor));
  deployment='dep-v2';
  const overview=()=>overviewGET(new Request('http://127.0.0.1:43120/api/fleet-control/overview',
    {headers:{host:'127.0.0.1:43120',authorization:'Bearer '+officeToken}}));
  await overview();
  const current=(await (await overview()).json()).hosts[0];
  assert.notEqual(current.historyIdentity,initial.identity);
  const rollover=await call(diffQuery);
  assert.equal(rollover.status,200);
  assert.deepEqual(await rollover.json(),{identity:current.historyIdentity,cursor:next,reset:true,
    equity:[['primary.nova',1,nextPoint]],health:[[1,null]]});
  assert(seen[2].endsWith('hours=24'));

});

test('browser applies corrections and removals and replaces an expired cursor snapshot',()=>{
  const empty={identity:'',cursor:'',equity:new Map(),health:new Map(),failed:false};
  const baseline=applyHistory(empty,{identity:'identity',cursor,reset:true,equity:[['primary.nova',1,point]],health:[[1,{at,cpu:15,ram:50,volumes:[]}]]});
  const delta=applyHistory(baseline,{identity:'identity',cursor:next,reset:false,equity:[['primary.nova',1,null],['primary.nova',2,point]],health:[]});
  assert.equal(baseline.equity.get('primary.nova').has(1),true);
  assert.deepEqual([...delta.equity.get('primary.nova')],[[2,point]]);
  assert.equal(delta.health.size,1);
  const expired=applyHistory(delta,{identity:'identity',cursor,reset:true,equity:[],health:[]});
  assert.equal(expired.equity.size,0);
  assert.equal(expired.health.size,0);
});
