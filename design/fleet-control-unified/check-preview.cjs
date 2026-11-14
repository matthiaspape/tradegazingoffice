// Run with the installed Playwright package; exercises only this local file preview.
const {chromium} = require(process.env.OFFICE_PREVIEW_PLAYWRIGHT || '/Users/matthiaspape/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {pathToFileURL} = require('node:url');
const {join} = require('node:path');
const {writeFileSync} = require('node:fs');
const assert = require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.OFFICE_PREVIEW_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],network=[],checks=[];
  const file=pathToFileURL(join(__dirname,'index.html')).href;
  try {
    for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:1000}});
      page.on('pageerror',e=>errors.push(String(e)));
      page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
      for(const theme of ['dark','light']){
        for(const [route,title] of [['overview','Fleet Control'],['vps/atlas','Atlas VPS'],['vps/borealis','Borealis VPS'],['fleet/nova','Nova'],['fleet/vega','Vega'],['fleet/orion','Orion']]){
          await page.goto(`${file}#${route}`);
          await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
          await page.getByRole('heading',{name:title,exact:true,level:1}).waitFor();
          assert(await page.locator('.study').isVisible(),'Persistent study label');
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${width}/${theme}/${route}`);
          assert(await page.locator('.brand img:visible').evaluate(i=>i.complete&&i.naturalWidth>0),'Original logo loaded');
          if(route==='overview'){
            assert.equal(await page.locator('.vps').count(),2);
            assert.equal(await page.locator('.fleet').count(),3);
            for(const field of ['Konto-Balance','Konto-Equity','Profit heute','Unrealized PnL'])assert.equal(await page.locator('.fleet dt').filter({hasText:field}).count(),3);
            if(width===1440&&theme==='dark')await page.screenshot({path:join(__dirname,'desktop-preview.png'),fullPage:true});
            if(width===390&&theme==='dark')await page.screenshot({path:join(__dirname,'mobile-preview.png'),fullPage:true});
          }
          if(route==='vps/atlas'&&width===1440&&theme==='dark')await page.screenshot({path:join(__dirname,'vps-detail-preview.png'),fullPage:true});
          if(route==='fleet/nova'&&width===1440&&theme==='dark')await page.screenshot({path:join(__dirname,'fleet-detail-preview.png'),fullPage:true});
          if(route==='fleet/orion'){
            assert.equal(await page.getByText('Daten veraltet',{exact:true}).count(),1);
            assert.equal(await page.locator('.detail-metrics dd').count(),4);
            assert.equal(await page.locator('.chart polyline').count(),2,'Gap splits the path');
          }
          checks.push({width,theme,route,passed:true});
        }
      }
      await page.goto(`${file}#overview`);
      await page.getByRole('link',{name:'Nova · Flottendetails öffnen'}).click();
      await page.getByRole('heading',{name:'Nova',exact:true,level:1}).waitFor();
      await page.getByRole('link',{name:'Atlas VPS →',exact:true}).click();
      await page.getByRole('heading',{name:'Atlas VPS',exact:true,level:1}).waitFor();
      await page.getByRole('link',{name:'← Alle VPS und Flotten'}).click();
      await page.getByRole('heading',{name:'Fleet Control',exact:true,level:1}).waitFor();
      const link=page.getByRole('link',{name:'Vega · Flottendetails öffnen'});
      await link.focus();await page.keyboard.press('Enter');
      await page.getByRole('heading',{name:'Vega',exact:true,level:1}).waitFor();
      await page.goBack();
      await page.getByRole('heading',{name:'Fleet Control',exact:true,level:1}).waitFor();
      await page.locator('#scenario').selectOption('waiting');
      assert.equal(await page.locator('.fleet').count(),0);
      assert.equal(await page.locator('.vps .empty').count(),2);
      assert.equal(await page.locator('.host-metrics').count(),2,'Host survives EA-less state');
      await page.goto(`${file}#fleet/nova/risk`);
      await page.getByRole('heading',{name:'Risiko',exact:true,level:1}).waitFor();
      await page.reload();await page.getByRole('heading',{name:'Risiko',exact:true,level:1}).waitFor();
      await page.goto(`${file}#unknown`);
      await page.getByRole('heading',{name:'Ansicht nicht gefunden',exact:true}).waitFor();
      await page.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    const result={checked_at:new Date().toISOString(),preview_only:true,views:checks,interactions:'Card click, VPS link, keyboard Enter, history, EA-less state, direct detail reload, unknown route',page_errors:errors,http_requests:network};
    writeFileSync(join(__dirname,'checks.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({views:checks.length,interactions:'passed at all 3 widths',errors:errors.length,http_requests:network.length}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
