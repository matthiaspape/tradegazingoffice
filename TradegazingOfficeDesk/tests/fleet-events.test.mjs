import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventStore,ingest,pullEvents,scopedEvents,EVENT_LIMITS} from '../ops/fleet-events.mjs';
import {positionHistory,projectHost,nativeDecimal,sum,difference} from '../ops/fleet-model.mjs';
import {createReader} from '../ops/fleet-reader.mjs';

const now=Date.parse('2026-11-21T17:00:00Z'),at=n=>new Date(now+n*1000).toISOString();
const scope={account_key:'acct',environment:'DEMO',deployment_id:'dep1'};
const binding={id:'nova',name:'NOVA',broker:'FTMO',...scope};
const host={id:'primary',native_host_id:'vps',name:'VPS',ip:'',endpoint:'http://127.0.0.1:8766/',token_file:'/private/x',fresh_seconds:900,bindings:[binding]};
const original=(record_type,record_id,payload,extra={})=>({record_type,record_id,observed_at_utc:at(-60),...scope,quality:{},payload,...extra});
const deal=(id,position,entry,type,volume,price,profit,t,extra={})=>original('deal_event',`forward-deal-${id}`,{position_id:position,entry,type,volume,price,profit,
 commission:'-0.080000000000000002',swap:'0',fee:'0',symbol:'XAUUSD',broker_time_msc:String(t),owner:{status:'BOUND',revision:'r1'}},extra);
let next=1;
const observations=rows=>rows.map(original=>({cursor:String(next++),original}));
const payloads=rows=>rows.map(r=>({payload:r.payload}));

test('native %.17g doubles become exact decimals; sums and differences stay exact',()=>{
 assert.equal(nativeDecimal('0.029999999999999999'),'0.03');
 assert.equal(nativeDecimal('-0.080000000000000002'),'-0.08');
 assert.equal(nativeDecimal('1e-05'),'0.00001');
 assert.equal(nativeDecimal('-0.0'),'0');
 assert.equal(nativeDecimal('abc'),null);
 assert.equal(sum(['0.1','0.2']),'0.3');
 assert.equal(difference('80738.47','80496.76'),'241.71');
});

test('position history pairs entries and exits by position and ignores open or partial positions',()=>{
 const rows=positionHistory(payloads([
  deal(1,'10',0,0,'0.029999999999999999','4402.6999999999998','0',1767587401000),
  deal(2,'10',1,1,'0.029999999999999999','4410.5','23.399999999999999',1767600000000),
  deal(3,'11',0,1,'0.10000000000000001','1','0',1767500000000),
  deal(4,'11',1,0,'0.050000000000000003','1','5',1767510000000),
  deal(5,'12',0,0,'0.01','2','0',1767400000000),
 ]));
 assert.equal(rows.length,1);
 assert.deepEqual(rows[0],{id:'10',symbol:'XAUUSD',side:'BUY',volume:'0.03',openedAt:'2026-01-05T04:30:01.000',closedAt:'2026-01-05T08:00:00.000',
  openPrice:'4402.7',closePrice:'4410.5',net:'23.24',revision:'r1'});
});

test('history needs an evidenced hedging account and rejects reversals, missing money and bad times (F003, F004, F012)',()=>{
 const closed=[deal(1,'10',0,0,'0.1','1','0',1),deal(2,'10',1,1,'0.1','2','1',2)];
 assert.equal(positionHistory(payloads(closed),'NETTING').length,0);
 assert.equal(positionHistory(payloads(closed),'').length,0);
 const reversal=[deal(1,'20',0,0,'0.1','1','0',1),deal(2,'20',1,1,'0.05','1','0',2),deal(3,'20',2,1,'0.1','1','0',3),deal(4,'20',1,1,'0.05','1','0',4)];
 assert.equal(positionHistory(payloads(reversal)).length,0);
 const missing=payloads(closed);delete missing[1].payload.swap;
 assert.equal(positionHistory(missing)[0].net,null);
 const zero=payloads(closed);zero[1].payload.swap='0';
 assert.equal(positionHistory(zero)[0].net,'0.84');
 const far=payloads(closed);far[1].payload.broker_time_msc='100000000000000000000';
 assert.equal(positionHistory(far)[0].closedAt,null);
});

test('pull pages while the cursor advances, also across empty filtered pages, within one budget (F006, F010)',async()=>{
 const store=createEventStore();
 const pages={'0':{observations:[],next_cursor:'1000'},'1000':{observations:observations([deal(1,'10',0,0,'0.01','1','0',1)]),next_cursor:'2000'},'2000':{observations:[],next_cursor:'2000'}};
 let calls=0;
 await pullEvents(store,async after=>{calls++;return pages[after];},()=>now);
 assert.equal(calls,3);assert.equal(scopedEvents(store,binding,now).deals.length,1);assert.equal(store.journal.cursor,'2000');
 const endless=createEventStore();calls=0;let cursor=0n;
 await pullEvents(endless,async()=>{calls++;cursor+=1000n;return {observations:[],next_cursor:cursor.toString()};},()=>now);
 assert.equal(calls,EVENT_LIMITS.pages);
 const failing=createEventStore();calls=0;failing.journal.cursor='5';failing.failures=EVENT_LIMITS.failuresBeforeReread;
 await assert.rejects(pullEvents(failing,async after=>{calls++;if(calls===EVENT_LIMITS.pages)throw new Error('late');if(after==='5')throw Object.assign(new Error('gone'),{status:410});cursor+=1n;return {observations:[],next_cursor:cursor.toString()};},()=>now));
 assert(calls<=EVENT_LIMITS.pages);
});

test('a failed pull keeps the last journal; only an expired cursor or repeated failures reread from zero (F001)',async()=>{
 const store=createEventStore();
 await pullEvents(store,async()=>({observations:observations([deal(1,'10',0,0,'0.01','1','0',1)]),next_cursor:'7'}),()=>now);
 await pullEvents(store,async()=>({observations:[],next_cursor:'7'}),()=>now);
 assert.equal(scopedEvents(store,binding,now).state,'AVAILABLE');
 await assert.rejects(pullEvents(store,async()=>{throw new Error('down');},()=>now));
 let view=scopedEvents(store,binding,now);
 assert.equal(view.state,'STALE');assert.equal(view.deals.length,1);assert.equal(store.journal.cursor,'7');
 await assert.rejects(pullEvents(store,async()=>{throw Object.assign(new Error('gone'),{status:410});},()=>now));
 view=scopedEvents(store,binding,now);assert.equal(view.deals.length,1);assert.equal(view.state,'STALE');
 await pullEvents(store,async after=>after==='7'?Promise.reject(Object.assign(new Error('gone'),{status:410})):{observations:[],next_cursor:'0'},()=>now);
 view=scopedEvents(store,binding,now);assert.equal(view.state,'AVAILABLE');assert.equal(view.deals.length,0);assert.equal(store.journal.cursor,'0');
 const fresh=createEventStore();
 await assert.rejects(pullEvents(fresh,async()=>{throw new Error('down');},()=>now));
 assert.equal(scopedEvents(fresh,binding,now).state,'FAILED');
 assert.equal(scopedEvents(createEventStore(),binding,now).state,'LOADING');
});

test('correction contract: supersession and payload-hash versions count once (F002)',()=>{
 const store=createEventStore();
 const v=(id,profit,cursorRow)=>deal(id,'30',1,1,'0.1','2',profit,2,{quality:{correction_policy:'VERSIONED_BY_PAYLOAD_HASH'},record_id:`v-${cursorRow}`});
 const first=v(2,'1','a');first.payload.logical_record_id='deal-2';
 const second=v(2,'3','b');second.payload.logical_record_id='deal-2';
 const replaced=deal(9,'31',1,1,'0.1','2','50',2);
 const replacement={...deal(9,'31',1,1,'0.1','2','5',2),record_id:'forward-deal-9b',supersedes_record_id:'forward-deal-9'};
 ingest(store.journal,observations([deal(1,'30',0,0,'0.1','1','0',1),first,second,deal(8,'31',0,0,'0.1','1','0',1),replaced,replacement]));
 store.journal.pulledAt=now;
 const rows=positionHistory(payloads(scopedEvents(store,binding,now).deals));
 assert.deepEqual(rows.map(r=>[r.id,r.net]).sort(),[['30','2.84'],['31','4.84']]);
});

test('retention, heartbeat bounds, deployments and large cursors (F007, F008, F009, F011)',()=>{
 const store=createEventStore();
 ingest(store.journal,observations([deal(1,'10',0,0,'0.01','1','0',1,{observed_at_utc:at(-8*86400)}),original('incident_event','i-old',{code:'X'},{observed_at_utc:at(-8*86400)})]));
 store.journal.pulledAt=now;
 assert.equal(scopedEvents(store,binding,now).deals.length,0);assert.equal(scopedEvents(store,binding,now).incidents.length,0);
 ingest(store.journal,Array.from({length:EVENT_LIMITS.heartbeats+10},(_,i)=>({cursor:String(1000+i),original:original('telemetry_health',`h${i}`,{source_state:'RUNNING'},{account_key:`a${i}`})})));
 assert.equal(store.journal.heartbeats.size,EVENT_LIMITS.heartbeats);
 ingest(store.journal,[{cursor:'5000',original:original('telemetry_health','hA',{source_state:'RUNNING'},{observed_at_utc:at(-30)})},
  {cursor:'5001',original:original('telemetry_health','hB',{source_state:'HALTED'},{observed_at_utc:at(-20),deployment_id:'dep2'})}]);
 assert.equal(scopedEvents(store,binding,now).health.payload.source_state,'RUNNING');
 assert.equal(scopedEvents(store,{...binding,deployment_id:'dep2'},now).health.payload.source_state,'HALTED');
 const big=createEventStore();
 ingest(big.journal,[{cursor:'9007199254740992',original:original('incident_event','b1',{code:'A'})},{cursor:'9007199254740993',original:original('incident_event','b2',{code:'B'})}]);
 assert.equal(big.journal.incidents.size,2);
 ingest(big.journal,[{cursor:'9223372036854775808',original:original('incident_event','b3',{code:'C'})}]);
 assert.equal(big.journal.incidents.size,2);
});

test('bounded journal drops the oldest records first',()=>{
 const store=createEventStore();
 ingest(store.journal,observations(Array.from({length:EVENT_LIMITS.incidents+5},(_,i)=>original('incident_event',`i${i}`,{code:String(i)}))));
 assert.equal(store.journal.incidents.size,EVENT_LIMITS.incidents);
 assert.equal([...store.journal.incidents.values()].some(e=>e.row.record_id==='i0'),false);
});

test('fleet model shows native day result, floating result, heartbeat state, issues and history',()=>{
 const store=createEventStore();
 ingest(store.journal,observations([deal(1,'10',0,0,'0.01','1','0',1767587401000),deal(2,'10',1,1,'0.01','2','1',1767600000000),
  original('telemetry_health','h1',{source_state:'RUNNING'},{observed_at_utc:at(-30)}),
  original('incident_event','i1',{severity:'WARNING',code:'ENTRY_REFUSED',member:3,symbol:'GBPUSD',detail:'x',suppressed_repeats:2},{observed_at_utc:at(-120)}),
  original('incident_event','i2',{severity:'INFO',code:'OWN_POSITION_ADOPTED',detail:'y'},{observed_at_utc:at(-20)})]));
 store.journal.pulledAt=now;
 const account={...scope,observed_at:at(-30),position_mode:'HEDGING',account:{equity:'80738.470000000001',profit:'241.71000000000001',day_start_equity:'80496.76',currency:'EUR'},
  positions:[{payload:{symbol:'XAUUSD',position_id:'5',side:'BUY',volume:'0.03',price_open:'4402.7',price_current:'4410.5',sl:'4380',tp:'4450',profit:'23.4',stop_risk:'67.5',owner:{status:'BOUND',revision:'r1'}}}]};
 const bundle={desk:{accounts:[account]},health:{host_id:'vps',windows:[]}};
 const fleet=projectHost(host,bundle,now,{},store).fleets[0];
 assert.equal(fleet.profitToday,'241.71');assert.equal(fleet.unrealized,'241.71');assert.equal(fleet.status,'RUNNING');assert.equal(fleet.eventsState,'AVAILABLE');
 assert.deepEqual(fleet.issues.map(i=>i.code),['OWN_POSITION_ADOPTED','ENTRY_REFUSED']);
 assert.equal(fleet.issues[1].repeats,2);
 assert.equal(fleet.history.length,1);assert.equal(fleet.history[0].net,'0.84');
 assert.equal(fleet.positions[0].stopRisk,'67.5');assert.equal(fleet.positions[0].side,'BUY');
 assert.equal(projectHost(host,bundle,now+3600000,{},store).fleets[0].status,'Unbekannt');
 const unknownDay=projectHost(host,{...bundle,desk:{accounts:[{...account,account:{equity:'1'}}]}},now,{},store).fleets[0];
 assert.equal(unknownDay.profitToday,null);assert(unknownDay.reasons.some(r=>r.includes('Tagesbasis')));
 store.failed=true;
 const stale=projectHost(host,bundle,now,{},store).fleets[0];
 assert.equal(stale.eventsState,'STALE');assert.equal(stale.history.length,1);assert(stale.reasons.some(r=>r.includes('zuletzt empfangenen')));
});

test('production reader pulls events beside the account refresh without delaying it',async()=>{
 const urls=[];let release;const gate=new Promise(r=>{release=r;});
 const desk={accounts:[{...scope,observed_at:at(-30),position_mode:'HEDGING',account:{equity:'1'}}]},health={host_id:'vps',windows:[]};
 const reader=createReader({clock:()=>now,events:true,readToken:()=> 'fake-test-key-does-not-authorize-anywhere',fetcher:async url=>{
  urls.push(String(url));
  if(String(url).includes('/v1/events')){await gate;return Response.json({observations:observations([deal(1,'10',0,0,'0.01','1','0',1),deal(2,'10',1,1,'0.01','2','1',2)]),next_cursor:'2'});}
  return Response.json(String(url).includes('health')?health:desk);}});
 const first=await reader([host]);
 assert.equal(first.hosts[0].fleets[0].eventsState,'LOADING');
 assert(urls.some(u=>u.includes('/v1/events?after=0&limit=1000')));
 release();await new Promise(r=>setTimeout(r,5));
 const second=await reader([host]);
 assert.equal(second.hosts[0].fleets[0].eventsState,'AVAILABLE');assert.equal(second.hosts[0].fleets[0].history.length,1);
});
