// Real FleetControl mounted/unmounted by React; every API response is synthetic.
const {chromium,browserOptions}=require('./browser-runtime.cjs');
const {mkdirSync,writeFileSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
const assert=require('node:assert/strict');
const time=Date.parse('2026-11-14T12:00:00Z');
const endpoint='**/api/fleet-control/overview';
const emptyResources={retry:0,poll:0,tick:0,visibility:0};
function sample(count,{refreshing,current}){
 const observedAt=new Date(time-(current?15:1200)*1000).toISOString();
 return {mode:'NATIVE',asOf:new Date(time).toISOString(),refreshing,hosts:[{id:'test',name:`Healthprobe ${count}`,ip:'192.0.2.10',observedAt,state:current?'CURRENT':'STALE',connection:'CURRENT',lastPull:new Date(time).toISOString(),issue:null,cpu:42,cpuMax:50,ram:{percent:50,used:500,total:1000},volumes:[],samples:20,cpuSamples:20,expected:20,attention:[],waitingForEa:true,unboundAccounts:0,series:[],processes:[],fleets:[]}]};
}
async function createPage(browser,url,errors){
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(String(e)));
 await page.clock.install({time:new Date(time-2*3600000)});
 await page.route('**/api/local/session',route=>route.fulfill({json:{ok:true}}));
 await page.goto(url);
 await page.getByRole('button',{name:'Mount Fleet Control',exact:true}).waitFor();
 await page.clock.pauseAt(new Date(time));
 return page;
}
const mount=page=>page.getByRole('button',{name:'Mount Fleet Control',exact:true}).click();
async function unmount(page){
 await page.getByRole('button',{name:'Unmount Fleet Control',exact:true}).click();
 await page.getByRole('button',{name:'Mount Fleet Control',exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Fleet Control',exact:true}).count(),0);
}
async function trackResources(page){
 await page.evaluate(()=>{
  const retry=new Set(),poll=new Set(),tick=new Set(),visibility=new Set();
  const timeout=window.setTimeout.bind(window),clearTimeout=window.clearTimeout.bind(window);
  const interval=window.setInterval.bind(window),clearInterval=window.clearInterval.bind(window);
  const add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
  const fetch=window.fetch.bind(window);
  let retryCreated=0,overviewRequests=0,responseProcessed;
  window.fleetOverviewProcessed=new Promise(resolve=>{responseProcessed=resolve;});
  window.fleetOverviewCompleted=0;
  window.fetch=async(...args)=>{
   if(String(args[0])==='/api/fleet-control/overview')overviewRequests++;
   const response=await fetch(...args);
   if(String(args[0])==='/api/fleet-control/overview'){
    const json=response.json.bind(response);
    response.json=async()=>{const value=await json();window.fleetOverviewCompleted++;responseProcessed();return value;};
   }
   return response;
  };
  window.setTimeout=(handler,delay,...args)=>{
   if(delay!==2000||typeof handler!=='function')return timeout(handler,delay,...args);
   retryCreated++;
   const id=timeout((...values)=>{retry.delete(id);handler(...values);},delay,...args);
   retry.add(id);return id;
  };
  window.clearTimeout=id=>{retry.delete(id);clearTimeout(id);};
  window.setInterval=(handler,delay,...args)=>{
   const id=interval(handler,delay,...args);
   if(delay===300000)poll.add(id);
   if(delay===30000)tick.add(id);
   return id;
  };
  window.clearInterval=id=>{poll.delete(id);tick.delete(id);clearInterval(id);};
  document.addEventListener=(type,listener,options)=>{
   if(type==='visibilitychange')visibility.add(listener);
   add(type,listener,options);
  };
  document.removeEventListener=(type,listener,options)=>{
   if(type==='visibilitychange')visibility.delete(listener);
   remove(type,listener,options);
  };
  window.fleetCleanupResources=()=>({retry:retry.size,poll:poll.size,tick:tick.size,visibility:visibility.size});
  window.fleetCleanupCounters=()=>({retryCreated,overviewRequests});
  window.fleetCleanupDocument=document;
 });
}
const resources=page=>page.evaluate(()=>window.fleetCleanupResources());
const counters=page=>page.evaluate(()=>window.fleetCleanupCounters());
const wallDelay=()=>new Promise(resolve=>setTimeout(resolve,2100));
async function cleanupCase(browser,url,errors){
 const page=await createPage(browser,url,errors);let calls=0;
 try{
  await trackResources(page);
  await page.route(endpoint,route=>route.fulfill({json:sample(++calls,{refreshing:true,current:false})}));
  await mount(page);await page.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  assert.deepEqual(await resources(page),{retry:1,poll:1,tick:1,visibility:1},'Probe must see all four resources before unmount');
  await wallDelay(); // A slow host must not let the paused 2-second retry fire.
  await unmount(page);
  assert.equal(await page.evaluate(()=>window.fleetCleanupDocument===document),true,'React unmount must retain the original document');
  assert.deepEqual(await resources(page),emptyResources,'React cleanup leaked tracked resources');
  await page.clock.runFor(601000);
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal((await counters(page)).overviewRequests,1,'Unmount caused an overview fetch');
  assert.equal(calls,1,'Unmount prevents catch-up, normal polls and visibility-triggered requests');
  // A new mount must own exactly one set of resources, with no leftovers.
  await mount(page);await page.getByRole('link',{name:'Healthprobe 2 →',exact:true}).waitFor();
  assert.deepEqual(await resources(page),{retry:1,poll:1,tick:1,visibility:1});
  await unmount(page);assert.deepEqual(await resources(page),emptyResources);
 }finally{await page.close();}
}
async function lateResponseCase(browser,url,errors){
 const page=await createPage(browser,url,errors);let calls=0,release,started;
 const gate=new Promise(resolve=>{release=resolve;}),requestStarted=new Promise(resolve=>{started=resolve;});
 try{
  await trackResources(page);
  await page.route(endpoint,async route=>{
   calls++;started();await gate;await route.fulfill({json:sample(calls,{refreshing:true,current:false})});
  });
  await mount(page);await requestStarted;await unmount(page);
  assert.deepEqual(await resources(page),emptyResources);
  const before=await counters(page);
  const response=page.waitForResponse('**/api/fleet-control/overview');
  release();await response;
  await page.evaluate(async()=>{await window.fleetOverviewProcessed;await Promise.resolve();});
  assert.equal((await counters(page)).retryCreated,before.retryCreated,'Late response allocated a retry after unmount');
  assert.deepEqual(await resources(page),emptyResources);
  await page.clock.runFor(10000);
  assert.equal((await counters(page)).retryCreated,before.retryCreated,'Late response allocated a retry after unmount');
  assert.equal((await counters(page)).overviewRequests,1);
  assert.deepEqual(await resources(page),emptyResources,'Late response must not allocate a new retry after unmount');
  assert.equal(calls,1);
 }finally{release();await page.close();}
}
async function requestAfterUnmountCase(browser,url,errors){
 const page=await createPage(browser,url,errors);
 try{
  await trackResources(page);
  await page.route(endpoint,route=>route.fulfill({json:sample(1,{refreshing:false,current:true})}));
  await mount(page);await page.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  await unmount(page);
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal((await counters(page)).overviewRequests,1,'Unmount caused an overview fetch');
 }finally{await page.close();}
}
(async()=>{
 const {startFleetHarness,mutations}=await import('./fleet-browser-harness.mjs');
 const browser=await chromium.launch(browserOptions());
 const errors=[],checks=[],negativeControls=[];
 let harness;
 try{
  harness=await startFleetHarness();
  const p=await createPage(browser,harness.url,errors);let calls=0;
  await p.route(endpoint,route=>route.fulfill({json:sample(++calls,{refreshing:calls===1,current:calls>1})}));
  await mount(p);await p.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  await p.getByText('Health fehlt / veraltet',{exact:true}).waitFor();
  await p.clock.runFor(2000);await p.getByRole('link',{name:'Healthprobe 2 →',exact:true}).waitFor();
  await p.getByText('Health aktuell',{exact:true}).waitFor();assert.equal(calls,2);
  await p.clock.runFor(60000);assert.equal(calls,2);
  checks.push('Pending refresh becomes current after 2 seconds, without a five-minute delay');await p.close();

  const bounded=await createPage(browser,harness.url,errors);let retries=0;
  await bounded.route(endpoint,route=>route.fulfill({json:sample(++retries,{refreshing:true,current:false})}));
  await mount(bounded);await bounded.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  for(let i=2;i<=7;i++){await bounded.clock.runFor(2000);await bounded.getByRole('link',{name:`Healthprobe ${i} →`,exact:true}).waitFor();}
  await bounded.clock.runFor(60000);assert.equal(retries,7);
  checks.push('Still-pending refresh stops after six follow-ups');await bounded.close();

  await cleanupCase(browser,harness.url,errors);
  checks.push('Real React unmount in the same document removes retry, poll, clock and visibility listener; no requests over two poll intervals; remount owns exactly one set');
  await lateResponseCase(browser,harness.url,errors);
  checks.push('An in-flight overview response completing after unmount cannot schedule another retry');
  await requestAfterUnmountCase(browser,harness.url,errors);
  checks.push('Synchronous browser-side fetch counter proves no overview request after unmount and visibility event');

  const resumed=await createPage(browser,harness.url,errors);let wakeups=0;
  await resumed.route(endpoint,async route=>{
   const now=await resumed.evaluate(()=>Date.now());
   const data=sample(++wakeups,{refreshing:false,current:true});
   data.asOf=new Date(now).toISOString();data.hosts[0].observedAt=new Date(now-15000).toISOString();
   return route.fulfill({json:data});
  });
  await mount(resumed);await resumed.getByRole('link',{name:'Healthprobe 1 →',exact:true}).waitFor();
  await resumed.clock.setSystemTime(new Date(time+20*60000));
  await resumed.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await resumed.getByRole('link',{name:'Healthprobe 2 →',exact:true}).waitFor();
  await resumed.getByText('Health aktuell',{exact:true}).waitFor();assert.equal(wakeups,2);
  checks.push('Returning to the visible Desk immediately refreshes after a long pause');await resumed.close();
  await harness.close();harness=null;

  for(const mutation of Object.keys(mutations)){
   const mutant=await startFleetHarness(mutation);
   try{
    const late=mutation==='late-response',request=mutation==='post-unmount-fetch';
    const run=late?lateResponseCase:request?requestAfterUnmountCase:cleanupCase;
    await assert.rejects(()=>run(browser,mutant.url,errors),error=>{
     assert.equal(error.code,'ERR_ASSERTION');
     if(late||request){
      assert.match(error.message,late?/^Late response allocated a retry after unmount/:/^Unmount caused an overview fetch/);
      assert.equal(error.actual,late?1:2);assert.equal(error.expected,late?0:1);
     }else{
      assert.match(error.message,/^React cleanup leaked tracked resources/);
      assert.deepEqual(error.actual,{...emptyResources,[mutation]:1});
     }
     return true;
    });
    assert.equal(mutant.wasMutated(),true,'Negative control must modify the real component');
    negativeControls.push({removed_cleanup:mutation,detected:true});
   }finally{await mutant.close();}
  }
  assert.deepEqual(errors,[]);
  const output=resolve(process.env.FLEET_BROWSER_REPORT||resolve(__dirname,'../work/fleet-freshness-browser.json'));
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify({checked_at:new Date().toISOString(),synthetic_api:true,real_react_component:true,checks,negative_controls:negativeControls,page_errors:errors},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,negative_controls:negativeControls.length,page_errors:errors.length,synthetic_api:true}));
 }finally{if(harness)await harness.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
