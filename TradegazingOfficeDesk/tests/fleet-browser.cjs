// Read-only browser checks against the isolated Office QA instance on 43121.
const {chromium,request}=require('/Users/matthiaspape/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {mkdirSync,writeFileSync,readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:43121',output=resolve(__dirname,'../docs/mission-8');
(async()=>{
 mkdirSync(output,{recursive:true});
 const privateOutput=resolve(__dirname,'../../.office-desk-data/dreamteam');
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const errors=[],checks=[];
 try {
  const anon=await request.newContext();assert.equal((await anon.get(base+'/api/fleet-control/overview')).status(),401);await anon.dispose();
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(base);await page.locator('.fc-vps').first().waitFor();
   const native=await (await page.request.get(base+'/api/fleet-control/overview')).json();
   assert.equal(native.mode,'NATIVE');assert.equal(native.hosts.length,1);assert.equal(native.hosts[0].waitingForEa,true);
   assert.equal(await page.locator('.fc-fleet').count(),0);assert(!JSON.stringify(native).includes('token_file'));
   assert(!JSON.stringify(native).includes('Authorization'));assert.equal((await page.request.get(base+'/api/fleet-control/overview?source=other')).status(),400);
   if(width===1440)await page.screenshot({path:resolve(privateOutput,'mission-8-native.png'),fullPage:true});
   await page.locator('.fc-vps-head h2 a').click();await page.getByRole('heading',{name:native.hosts[0].name,exact:true,level:1}).waitFor();
   await page.getByRole('heading',{name:'CPU-Last',exact:true}).waitFor();
   assert(await page.getByText('Endstand je Fenster',{exact:false}).count()>0);
   await page.goto(base+'/controlling/fleet-control/nova?mode=native');
   await page.getByText('Dieser Einsatz oder VPS ist in der ausgewählten Datenquelle nicht gebunden.',{exact:false}).waitFor();
   assert.equal(await page.locator('.fc-values').count(),0);
   await page.getByLabel('Datenquelle').selectOption('DEMO');await page.locator('.fc-fleet').nth(2).waitFor();
   assert.equal(await page.locator('.fc-vps').count(),2);assert.equal(await page.locator('.fc-fleet').count(),3);
   assert.equal(await page.getByRole('link',{name:/Orion.*Zuletzt Failure/s}).count(),1,'Accessible card name includes failure state');
   for(const theme of ['light','dark']){
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overview overflow at ${width}/${theme}`);
    checks.push({width,theme,view:'overview'});
   }
   if(width===1440||width===390)await page.screenshot({path:resolve(output,width===1440?'desktop-demo.png':'mobile-demo.png'),fullPage:true});
   const nova=page.getByRole('link',{name:/Nova.*Active/s});await nova.focus();await page.keyboard.press('Enter');
   await page.getByRole('heading',{name:'Nova',exact:true,level:1}).waitFor();assert.equal(await page.getByLabel('Datenquelle').inputValue(),'DEMO');
   assert.equal(await page.locator('.fc-values dt').count(),4);
   await page.getByRole('link',{name:'Atlas VPS →',exact:true}).click();await page.getByRole('heading',{name:'Atlas VPS',exact:true,level:1}).waitFor();
   await page.getByRole('heading',{name:'MT5-Prozesse & Collector',exact:true}).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`VPS detail overflow at ${width}`);
   await page.goBack();await page.getByRole('heading',{name:'Nova',exact:true,level:1}).waitFor();
   await page.reload();await page.getByRole('heading',{name:'Nova',exact:true,level:1}).waitFor();
   await page.getByLabel('Beobachtungsfenster').selectOption('168');assert(new URL(page.url()).searchParams.get('range')==='168');
   for(const id of ['vega','orion']){
    await page.goto(base+'/controlling/fleet-control/'+id+'?mode=demo');await page.getByRole('heading',{name:id==='vega'?'Vega':'Orion',exact:true,level:1}).waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${id} detail overflow at ${width}`);
    if(id==='orion')assert.equal(await page.locator('.fc-values dd').first().innerText().then(v=>v.startsWith('—')),true);
   }
   await page.goto(base+'/missions');await page.getByRole('button',{name:'+ Neue Mission',exact:true}).waitFor();
   assert.equal((await (await page.request.get(base+'/api/missions')).json()).missions.length,0,'QA database remains empty');
   await page.close();checks.push({width,view:'native + details + keyboard + history + PM',passed:true});
  }
  assert.deepEqual(errors,[]);
  writeFileSync(resolve(output,'browser-checks.json'),JSON.stringify({checked_at:new Date().toISOString(),qa_origin:base,checks,page_errors:errors,native:'One real host, EA-less; no trading source fabricated',writes:'No application data writes; session bootstrap only'},null,2)+'\n');
  console.log(JSON.stringify({widths:[1440,390,320],native:true,demo:true,details:true,keyboard:true,history:true,project_management:true,page_errors:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
