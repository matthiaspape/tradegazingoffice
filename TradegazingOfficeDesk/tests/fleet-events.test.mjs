import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventStore,ingest,pullEvents,scopedEvents,EVENT_LIMITS} from '../ops/fleet-events.mjs';
import {positionHistory,projectHost,nativeDecimal,sum,difference} from '../ops/fleet-model.mjs';
import {createReader} from '../ops/fleet-reader.mjs';

const now=Date.parse('2026-11-21T17:00:00Z'),at=n=>new Date(now+n*1000).toISOString();
const scope={account_key:'acct',environment:'DEMO',deployment_id:'dep1'};
const binding={id:'nova',name:'NOVA',broker:'FTMO',...scope};
const host={id:'primary',native_host_id:'vps',name:'VPS',ip:'',endpoint:'http://127.0.0.1:8766/',token_file:'/private/x',fresh_seconds:900,bindings:[binding]};
const original=(record_type,record_id,payload,extra={})=>({record_type,record_id,observed_at_utc:at(-60),...scope,payload,...extra});
const deal=(id,position,entry,type,volume,price,profit,t)=>original('deal_event',`forward-deal-${id}`,{position_id:position,entry,type,volume,price,profit,
 commission:'-0.080000000000000002',swap:'0',fee:'0',symbol:'XAUUSD',broker_time_msc:String(t),owner:{status:'BOUND',revision:'r1'}});
const observations=(rows,start=1)=>rows.map((original,i)=>({cursor:String(start+i),original}));

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
 const rows=positionHistory([
  deal(1,'10',0,0,'0.029999999999999999','4402.6999999999998','0',1767587401000),
  deal(2,'10',1,1,'0.029999999999999999','4410.5','23.399999999999999',1767600000000),
  deal(3,'11',0,1,'0.10000000000000001','1','0',1767500000000),
  deal(4,'11',1,0,'0.050000000000000003','1','5',1767510000000),
  deal(5,'12',0,0,'0.01','2','0',1767400000000),
 ].map(r=>({payload:r.payload})));
 assert.equal(rows.length,1);
 assert.deepEqual(rows[0],{id:'10',symbol:'XAUUSD',side:'BUY',volume:'0.03',openedAt:'2026-01-05T04:30:01.000',closedAt:'2026-01-05T08:00:00.000',
  openPrice:'4402.7',closePrice:'4410.5',net:'23.24',revision:'r1'});
});

test('event pull pages by cursor, keeps only desk records of the binding and rereads from zero after a failure',async()=>{
 const store=createEventStore();
 const pages={'0':{observations:observations([deal(1,'10',0,0,'0.01','1','0',1),original('telemetry_health','h1',{source_state:'RUNNING'}),
   original('incident_event','i1',{severity:'WARNING',code:'ENTRY_REFUSED'}),original('account_snapshot','a1',{})]),next_cursor:'4'},
  '4':{observations:[],next_cursor:'4'}};
 await pullEvents(store,async after=>pages[after],()=>now);
 assert.equal(store.cursor,'4');
 const mine=scopedEvents(store,binding);
 assert.equal(mine.deals.length,1);assert.equal(mine.incidents.length,1);assert.equal(mine.health.payload.source_state,'RUNNING');assert.equal(mine.available,true);
 assert.equal(scopedEvents(store,{...binding,deployment_id:'other'}).deals.length,0);
 let calls=0;
 await pullEvents(store,async after=>{calls++;if(after==='4')throw new Error('expired');return {observations:[],next_cursor:'0'};},()=>now);
 assert.equal(calls,2);assert.equal(store.cursor,'0');assert.equal(scopedEvents(store,binding).deals.length,0);
});

test('bounded journal drops the oldest records first',()=>{
 const store=createEventStore();
 ingest(store,observations(Array.from({length:EVENT_LIMITS.incidents+5},(_,i)=>original('incident_event',`i${i}`,{code:String(i)}))));
 assert.equal(store.incidents.size,EVENT_LIMITS.incidents);
 assert.equal([...store.incidents.values()].some(e=>e.row.record_id==='i0'),false);
});

test('fleet model shows native day result, floating result, heartbeat state, issues and history',()=>{
 const store=createEventStore();
 ingest(store,observations([deal(1,'10',0,0,'0.01','1','0',1767587401000),deal(2,'10',1,1,'0.01','2','1',1767600000000),
  original('telemetry_health','h1',{source_state:'RUNNING'},{observed_at_utc:at(-30)}),
  original('incident_event','i1',{severity:'WARNING',code:'ENTRY_REFUSED',member:3,symbol:'GBPUSD',detail:'x',suppressed_repeats:2},{observed_at_utc:at(-120)}),
  original('incident_event','i2',{severity:'INFO',code:'OWN_POSITION_ADOPTED',detail:'y'},{observed_at_utc:at(-20)})]));
 const account={...scope,observed_at:at(-30),account:{equity:'80738.470000000001',profit:'241.71000000000001',day_start_equity:'80496.76',currency:'EUR'},
  positions:[{payload:{symbol:'XAUUSD',position_id:'5',side:'BUY',volume:'0.03',price_open:'4402.7',price_current:'4410.5',sl:'4380',tp:'4450',profit:'23.4',stop_risk:'67.5',owner:{status:'BOUND',revision:'r1'}}}]};
 const bundle={desk:{accounts:[account]},health:{host_id:'vps',windows:[]}};
 const fleet=projectHost(host,bundle,now,{},store).fleets[0];
 assert.equal(fleet.profitToday,'241.71');assert.equal(fleet.unrealized,'241.71');assert.equal(fleet.status,'RUNNING');
 assert.deepEqual(fleet.issues.map(i=>i.code),['OWN_POSITION_ADOPTED','ENTRY_REFUSED']);
 assert.equal(fleet.issues[1].repeats,2);
 assert.equal(fleet.history.length,1);assert.equal(fleet.history[0].net,'0.84');
 assert.equal(fleet.positions[0].stopRisk,'67.5');assert.equal(fleet.positions[0].side,'BUY');
 const old=projectHost(host,bundle,now+3600000,{},store).fleets[0];
 assert.equal(old.status,'Unbekannt');
 const unknownDay=projectHost(host,{...bundle,desk:{accounts:[{...account,account:{equity:'1'}}]}},now,{},store).fleets[0];
 assert.equal(unknownDay.profitToday,null);assert(unknownDay.reasons.some(r=>r.includes('Tagesbasis')));
});

test('production reader pulls events beside the account refresh without delaying it',async()=>{
 const urls=[];let release;const gate=new Promise(r=>{release=r;});
 const desk={accounts:[{...scope,observed_at:at(-30),account:{equity:'1'}}]},health={host_id:'vps',windows:[]};
 const reader=createReader({clock:()=>now,events:true,readToken:()=> 'fake-test-key-does-not-authorize-anywhere',fetcher:async url=>{
  urls.push(String(url));
  if(String(url).includes('/v1/events')){await gate;return Response.json({observations:observations([deal(1,'10',0,0,'0.01','1','0',1),deal(2,'10',1,1,'0.01','2','1',2)]),next_cursor:'2'});}
  return Response.json(String(url).includes('health')?health:desk);}});
 const first=await reader([host]);
 assert.equal(first.hosts[0].fleets[0].eventsAvailable,false);
 assert(urls.some(u=>u.includes('/v1/events?after=0&limit=1000')));
 release();await new Promise(r=>setTimeout(r,5));
 const second=await reader([host]);
 assert.equal(second.hosts[0].fleets[0].eventsAvailable,true);assert.equal(second.hosts[0].fleets[0].history.length,1);
});
