const assert=require('node:assert/strict');
const {chromium,browserOptions}=require('./browser-runtime.cjs');

(async()=>{
 const {startFleetHarness}=await import('./fleet-browser-harness.mjs');
 const harness=await startFleetHarness();
 let browser;
 try {
  browser=await chromium.launch(browserOptions());
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  const stamp=new Date(Date.now()-60000).toISOString();
  const slot=Math.floor(Date.parse(stamp)/300000)*300;
  const requests=[];
  const baseline='a'.repeat(32),next='b'.repeat(32);
  let release;
  const historyGate=new Promise(resolve=>{release=resolve;});
  await page.route('**/api/local/session',route=>route.fulfill({json:{ok:true}}));
  await page.route('**/api/fleet-control/overview',route=>route.fulfill({json:{
   mode:'NATIVE',asOf:new Date().toISOString(),splitHistory:true,hosts:[{
    id:'primary',name:'Test-VPS',historyIdentity:'v1',observedAt:stamp,state:'CURRENT',connection:'CURRENT',
    cpu:15,cpuMax:20,ram:{percent:55,used:500,total:1000},volumes:[],attention:[],
    fleets:[{id:'primary.nova',hostId:'primary',name:'NOVA',broker:'Test',environment:'DEMO',
     state:'CURRENT',observedAt:stamp,freshSeconds:960,status:'RUNNING',balance:'1000.00',
     equity:'1002.00',currency:'EUR',series:[]}]
   }]
  }}));
  await page.route('**/api/fleet-control/history?*',async route=>{
   const query=new URL(route.request().url()).searchParams;
   requests.push(Object.fromEntries(query));
   if(requests.length===1)await historyGate;
   const delta=query.has('after');
   await route.fulfill({json:{cursor:delta?next:baseline,reset:!delta,health:[],
    equity:[['primary.nova',slot,{at:stamp,value:delta?'1020.00':'1002.00'}]]}});
  });
  try{
   await page.goto(harness.url);
   await page.getByRole('button',{name:'Mount Fleet Control',exact:true}).click();
   await page.getByText('Daten aktuell',{exact:true}).waitFor();
   await page.getByText('Health aktuell',{exact:true}).waitFor();
   await page.getByText('Historie wird geladen …',{exact:true}).waitFor();
   release();
   await page.locator('figcaption').getByText(/1\.002,00.*Beobachtungen/).waitFor();
   assert.deepEqual(requests[0],{host:'primary',hours:'24'});
   await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   await page.locator('figcaption').getByText(/1\.020,00.*Beobachtungen/).waitFor();
   assert.deepEqual(requests[1],{host:'primary',hours:'24',after:baseline});
   await page.getByLabel('Beobachtungsfenster').selectOption('168');
   await page.locator('figcaption').getByText(/1\.002,00.*Beobachtungen/).waitFor();
   assert.deepEqual(requests[2],{host:'primary',hours:'168'});
   await page.getByRole('button',{name:'Unmount Fleet Control',exact:true}).click();
   await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   assert.equal(requests.length,3);
   assert.deepEqual(errors,[]);
  }finally{release();await page.close();}
  console.log('Fleet Control zeigt aktuelle Werte vor der Historie, übernimmt Cursor-Updates und lädt das neue Fenster vollständig.');
 }finally{if(browser)await browser.close();await harness.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
