const {chromium,browserOptions}=require('./browser-runtime.cjs');
const assert=require('node:assert/strict');
const {mkdirSync,writeFileSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
const time=Date.parse('2026-11-14T12:00:00Z');
const endpoint='**/api/fleet-control/overview';
function sample({state='CURRENT',connection='CURRENT'}={}){
 const observedAt=state==='UNAVAILABLE'?null:new Date(time-(state==='CURRENT'?15:1200)*1000).toISOString();
 const fleet={id:'test.fleet',hostId:'test',name:'Testflotte',broker:'Beispielbroker',deploymentId:'demo-test',environment:'DEMO',currency:'EUR',observedAt,freshSeconds:960,state,status:'Active',sharedAccount:false,balance:'100000.00',equity:'100840.00',profitToday:'200.00',unrealized:'340.00',series:[],reasons:[],positionMode:'HEDGING',variants:[],pools:[],positions:[]};
 return {mode:'NATIVE',asOf:new Date(time).toISOString(),refreshing:false,hosts:[{id:'test',name:'Test-VPS',ip:'192.0.2.10',observedAt,state,connection,lastPull:'2026-11-14T11:59:55Z',issue:null,cpu:42,cpuMax:50,ram:{percent:50,used:500,total:1000},volumes:[],samples:20,cpuSamples:20,expected:20,attention:[],waitingForEa:false,unboundAccounts:0,series:[],processes:[],fleets:[fleet]}]};
}
(async()=>{
 const {startFleetHarness}=await import('./fleet-browser-harness.mjs');
 const harness=await startFleetHarness();let browser;
 const checks=[],failures=[],errors=[];
 async function page(query=''){
  const p=await browser.newPage();p.setDefaultTimeout(3000);
  p.on('pageerror',e=>errors.push(String(e)));
  await p.clock.install({time:new Date(time-2*3600000)});
  let sessions=0;
  await p.route('**/api/local/session',r=>{sessions++;return r.fulfill({json:{ok:true}});});
  await p.goto(harness.url+query);await p.getByRole('button',{name:'Mount Fleet Control',exact:true}).waitFor();
  await p.clock.pauseAt(new Date(time));
  return {p,sessions:()=>sessions,mount:()=>p.getByRole('button',{name:'Mount Fleet Control',exact:true}).click()};
 }
 async function check(name,run){try{await run();checks.push(name);}catch(error){failures.push({name,error:String(error)});}}
 try{
  browser=await chromium.launch(browserOptions());
  await check('0030: all three demo curves end at their declared account equity, including stale fleet',async()=>{
   const {p,mount,sessions}=await page('?mode=demo');
   try{
    await mount();await p.locator('.fc-fleet').first().waitFor();
    const cards=p.locator('.fc-fleet');assert.equal(await cards.count(),3);
    for(const [i,value] of ['100.840,00 EUR','50.000,00 EUR','79.980,00 EUR'].entries()){
     const card=cards.nth(i);
     assert.ok((await card.locator('figcaption').innerText()).includes(`→ ${value} ·`));
     assert.ok((await card.locator('.fc-values').innerText()).includes(value));
    }
    await p.getByText('Daten fehlen / veraltet',{exact:true}).waitFor();assert.equal(sessions(),0);
   }finally{await p.close();}
  });
  for(const detail of ['vps','fleet'])await check(`0033: ${detail} demo detail explicitly labels fictional data`,async()=>{
   const {p,mount,sessions}=await page(detail==='vps'?'?mode=demo&test-vps=atlas':'?mode=demo&test-fleet=nova');
   try{
    await mount();
    const group=p.getByRole('group',{name:detail==='vps'?'VPS-Datenstatus':'Flotten-Datenstatus',exact:true});
    await group.getByText('Datenquelle: Fiktive Beispieldaten',{exact:true}).waitFor();
    assert.ok((await group.innerText()).includes('Verbindung: fiktiv · aktuell'));
    assert.equal(sessions(),0);
   }finally{await p.close();}
  });
  for(const detail of ['vps','fleet'])for(const state of [
   {state:'CURRENT',connection:'CURRENT',label:'aktuell',fresh:true},
   {state:'STALE',connection:'CURRENT',label:'aktuell',fresh:false},
   {state:'STALE',connection:'STALE',label:'veraltet',fresh:false},
   {state:'UNAVAILABLE',connection:'UNAVAILABLE',label:'nicht verfügbar',fresh:false},
  ])await check(`0033: ${detail} detail ${state.state}/${state.connection}`,async()=>{
   const {p,mount}=await page(detail==='vps'?'?test-vps=test':'?test-fleet=test.fleet');
   try{
    await p.route(endpoint,r=>r.fulfill({json:sample(state)}));await mount();
    const group=p.getByRole('group',{name:detail==='vps'?'VPS-Datenstatus':'Flotten-Datenstatus',exact:true});
    await group.waitFor();
    await group.getByText(detail==='vps'?(state.fresh?'Health aktuell':'Health fehlt / veraltet'):(state.fresh?'Daten aktuell':'Daten fehlen / veraltet'),{exact:true}).waitFor();
    await group.getByText('Datenquelle: VPS-Daten',{exact:true}).waitFor();
    assert.ok((await group.innerText()).includes(`Verbindung: ${state.label}`));
    assert.ok((await group.innerText()).includes('Letzter Backendabruf 14.11.2026, 12:59:55'));
   }finally{await p.close();}
  });
  await check('0032: expired session keeps original data, stops retries and requires explicit reload',async()=>{
   const {p,mount,sessions}=await page('?test-vps=test');let calls=0,expired=false;
   try{
    await p.route(endpoint,r=>{calls++;return expired?r.fulfill({status:401,json:{error:'Sitzung abgelaufen'}}):r.fulfill({json:sample()});});
    await mount();await p.getByRole('heading',{name:'Test-VPS',exact:true}).waitFor();
    const original=await p.locator('.fc-muted').filter({hasText:'Beobachtet'}).first().innerText();
    expired=true;await p.clock.runFor(300000);
    await p.getByRole('alert').filter({hasText:'Office-Sitzung abgelaufen'}).waitFor();
    const reload=p.getByRole('button',{name:'Seite neu laden',exact:true});await reload.waitFor();
    assert.equal(await p.locator('.fc-muted').filter({hasText:'Beobachtet'}).first().innerText(),original);
    assert.ok((await p.getByRole('group',{name:'VPS-Datenstatus'}).innerText()).includes('Office-Sitzung abgelaufen'));
    await p.clock.runFor(900000);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(calls,2);assert.equal(sessions(),1);
    expired=false;await Promise.all([p.waitForNavigation(),reload.click()]);await mount();
    await p.getByRole('heading',{name:'Test-VPS',exact:true}).waitFor();assert.equal(sessions(),2);assert.equal(calls,3);
    assert.equal(await p.getByRole('alert').count(),0);
   }finally{await p.close();}
  });
  await check('0032: first overview 401 stays EA-less without automatic session renewal',async()=>{
   const {p,mount,sessions}=await page();let calls=0;
   try{
    await p.route(endpoint,r=>{calls++;return r.fulfill({status:401,json:{error:'Sitzung abgelaufen'}});});
    await mount();await p.getByRole('alert').filter({hasText:'Office-Sitzung abgelaufen'}).waitFor();
    await p.getByText('Noch kein lesbarer Datenstand verfügbar.',{exact:true}).waitFor();
    await p.clock.runFor(900000);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(calls,1);assert.equal(sessions(),1);assert.equal(await p.locator('.fc-fleet').count(),0);
   }finally{await p.close();}
  });
  await check('0032: a source failure remains distinct and recovers on the normal poll',async()=>{
   const {p,mount,sessions}=await page('?test-fleet=test.fleet');let calls=0;
   try{
    await p.route(endpoint,r=>{calls++;return calls===2?r.fulfill({status:503,json:{error:'Unavailable'}}):r.fulfill({json:sample()});});
    await mount();await p.getByRole('heading',{name:'Testflotte',exact:true}).waitFor();
    await p.clock.runFor(300000);await p.getByRole('alert').filter({hasText:'Fleet-Daten momentan nicht erreichbar'}).waitFor();
    assert.equal(await p.getByRole('button',{name:'Seite neu laden',exact:true}).count(),0);
    await p.clock.runFor(300000);await p.getByRole('group',{name:'Flotten-Datenstatus'}).getByText('Daten aktuell',{exact:true}).waitFor();
    assert.equal(await p.getByRole('alert').count(),0);assert.equal(sessions(),1);assert.equal(calls,3);
   }finally{await p.close();}
  });
  assert.deepEqual(errors,[]);
  const output=resolve(process.env.FLEET_STATUS_REPORT||resolve(__dirname,'../work/fleet-status-browser.json'));mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify({checked_at:new Date().toISOString(),synthetic_api:true,real_react_component:true,checks,failures,page_errors:errors},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,failures:failures.length,page_errors:errors.length}));
  if(failures.length)throw new Error(JSON.stringify(failures));
 }finally{await harness.close();if(browser)await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
