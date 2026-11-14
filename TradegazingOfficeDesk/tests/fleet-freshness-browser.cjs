// Only the changed client timing flow; all API data below are explicitly synthetic test fixtures.
const {chromium}=require('/Users/matthiaspape/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:43121',time=Date.parse('2026-11-14T12:00:00Z');
const endpoint='**/api/fleet-control/overview';
function sample(count,{refreshing,current}){
 const observedAt=new Date(time-(current?15:1200)*1000).toISOString();
 return {mode:'NATIVE',asOf:new Date(time).toISOString(),refreshing,hosts:[{id:'test',name:`Healthprobe ${count}`,ip:'192.0.2.10',observedAt,state:current?'CURRENT':'STALE',connection:'CURRENT',lastPull:new Date(time).toISOString(),issue:null,cpu:42,cpuMax:50,ram:{percent:50,used:500,total:1000},volumes:[],samples:20,cpuSamples:20,expected:20,attention:[],waitingForEa:true,unboundAccounts:0,series:[],processes:[],fleets:[]}]};
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[],checks=[];
 async function page(){const p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.clock.install({time:new Date(time)});return p;}
 try{
  const p=await page();let calls=0;
  await p.route(endpoint,route=>{calls++;return route.fulfill({json:sample(calls,{refreshing:calls===1,current:calls>1})});});
  await p.goto(base);await p.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  await p.getByText('Health fehlt / veraltet',{exact:true}).waitFor();
  await p.clock.runFor(2000);await p.getByRole('link',{name:'Healthprobe 2 →',exact:true}).waitFor();
  await p.getByText('Health aktuell',{exact:true}).waitFor();assert.equal(calls,2);
  await p.clock.runFor(60000);assert.equal(calls,2,'Completed refresh stops catch-up before normal 5-minute poll');
  checks.push('Pending refresh becomes current after 2 seconds, without a five-minute delay');await p.close();

  const bounded=await page();let retries=0;
  await bounded.route(endpoint,route=>{retries++;return route.fulfill({json:sample(retries,{refreshing:true,current:false})});});
  await bounded.goto(base);await bounded.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  for(let i=2;i<=7;i++){await bounded.clock.runFor(2000);await bounded.getByRole('link',{name:`Healthprobe ${i} →`,exact:true}).waitFor();}
  await bounded.clock.runFor(60000);assert.equal(retries,7,'Initial request plus at most six follow-ups');
  checks.push('Still-pending refresh stops after six follow-ups');await bounded.close();

  const unmounted=await page();let extra=0;
  await unmounted.route(endpoint,route=>{extra++;return route.fulfill({json:sample(extra,{refreshing:true,current:false})});});
  await unmounted.goto(base);await unmounted.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  await unmounted.goto(base+'/missions');await unmounted.getByRole('button',{name:'+ Neue Mission',exact:true}).waitFor();
  await unmounted.clock.runFor(10000);assert.equal(extra,1,'Leaving Fleet Control cancels the scheduled follow-up');
  checks.push('Full document navigation stops catch-up; React cleanup is not isolated');await unmounted.close();

  const resumed=await page();let wakeups=0;
  await resumed.route(endpoint,async route=>{
   const now=await resumed.evaluate(()=>Date.now());
   const data=sample(++wakeups,{refreshing:false,current:true});
   data.asOf=new Date(now).toISOString();data.hosts[0].observedAt=new Date(now-15000).toISOString();
   return route.fulfill({json:data});
  });
  await resumed.goto(base);await resumed.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  await resumed.clock.setSystemTime(new Date(time+20*60000));
  await resumed.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await resumed.getByRole('link',{name:'Healthprobe 2 →',exact:true}).waitFor();
  await resumed.getByText('Health aktuell',{exact:true}).waitFor();assert.equal(wakeups,2);
  checks.push('Returning to the visible Desk immediately refreshes after a long pause');await resumed.close();
  assert.deepEqual(errors,[]);
  const output=resolve(__dirname,'../docs/mission-9');mkdirSync(output,{recursive:true});
  writeFileSync(resolve(output,'browser-checks.json'),JSON.stringify({checked_at:new Date().toISOString(),synthetic_api:true,isolated_origin:base,checks,page_errors:errors},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,page_errors:errors.length,synthetic_api:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
