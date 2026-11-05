"""Run only against a freshly set up, isolated Office QA instance on port 43120.
Requires Playwright and a local Chrome. Refuses a populated mission database.
"""
import asyncio
import json
import os
import re
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = 'http://127.0.0.1:43120'
ROOT = Path(__file__).resolve().parents[1]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('OFFICE_QA_CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'), headless=True)
        context = await browser.new_context(viewport={'width':1280,'height':1000})
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(BASE)
        await expect(page.get_by_role('heading', name='Fleet Control', exact=True)).to_be_visible()
        navigation = page.get_by_role('navigation', name='Desk-Bereiche')
        await expect(navigation.locator('.office-nav-group > p')).to_have_text(['Controlling', 'Projektmanagement'])
        metrics = page.get_by_role('region', name='Wichtigste Kennzahlen')
        await expect(metrics.locator('.fleet-coverage')).to_have_text([
            '2 von 3 Flotten · Teilumfang', '2 von 3 Flotten · Teilumfang',
            '2 von 3 Flotten · Teilumfang', '3 von 3 Flotten · Abgedeckt',
        ])
        await page.get_by_role('link', name='Orion öffnen').click()
        await expect(page.get_by_role('heading', name='Orion', exact=True)).to_be_visible()
        await expect(page.locator('#fleet-performance .fleet-coverage').first).to_have_text('0 von 1 Einsatz · Kein aktueller Wert')
        await navigation.get_by_role('link', name='Mission Log', exact=True).click()
        await expect(page).to_have_url(BASE+'/missions')
        await expect(page.get_by_role('button', name='+ Neue Mission')).to_be_enabled()
        empty = await page.request.get(BASE+'/api/missions')
        assert empty.status == 200
        assert (await empty.json())['missions'] == [], 'Refusing to write into a populated Office instance.'
        await expect(page.get_by_role('link', name='Tradegazing Office Desk Startseite')).to_be_visible()
        await page.get_by_role('button', name='+ Neue Mission').click()
        await page.get_by_label('Titel', exact=True).fill('QA · Office Desk prüfen')
        await page.get_by_label('Ziel', exact=True).fill('Isolierter Browserablauf für Missionen und Bug Board')
        await page.locator('#execution-kind').select_option('SYNTHESIS')
        await page.locator('#execution-complexity').select_option('STANDARD')
        await page.get_by_role('button', name='Mission anlegen', exact=True).click()
        await expect(page.locator('.mission-record')).to_have_count(1)
        await page.reload()
        await expect(page.locator('.mission-record')).to_have_count(1)
        mission = (await (await page.request.get(BASE+'/api/missions')).json())['missions'][0]
        await page.locator('.mission-summary').click()
        await page.get_by_label('Status', exact=True).select_option('IN_PROGRESS')
        await page.get_by_role('button', name='Mission speichern', exact=True).click()
        await expect(page.locator('.notice')).to_contain_text('Mission gespeichert')
        await navigation.get_by_role('link', name='Bug Board', exact=True).click()
        await expect(page.get_by_role('heading', name='Keine Bugs in dieser Auswahl')).to_be_visible()
        await page.get_by_role('button', name='+ Bug erfassen', exact=True).click()
        fields = {
            'Titel':'QA · Anzeigehinweis',
            'Erwartetes Verhalten':'Einheitliche Darstellung',
            'Tatsächliches Verhalten':'Fiktive Abweichung im QA-Kontext',
            'Auswirkung':'Keine echten Projektdaten betroffen',
            'Begründung des Gesamtrisikos':'Reiner isolierter Oberflächentest',
            'Grund der Zurückstellung':'Kein echter Auftragsblocker',
            'Kontext · Auftrag, Komponente, Konfiguration / optional Broker, Symbol, TF':'Isolierte QA-Instanz',
            'Belegreferenz · Logpfad, Bericht oder https://…':'TradegazingOfficeDesk/tests/browser-smoke.py',
            'Begründung / Einschränkung':'Fortsetzung möglich',
        }
        for name, value in fields.items():
            await page.get_by_label(name, exact=True).fill(value)
        await page.locator('.bug-editor').get_by_label('Mission').select_option(mission['id'])
        await page.get_by_label('Desk/API', exact=True).check()
        await page.locator('.bug-editor').get_by_label(re.compile(r'^Gesamtrisiko')).select_option('NIEDRIG')
        await page.get_by_role('button', name='Speichern', exact=True).click()
        await expect(page.locator('.bug-detail-heading')).to_contain_text('QA · Anzeigehinweis')
        await page.get_by_role('button', name='Bewertung bearbeiten', exact=True).click()
        await page.get_by_label('Verantwortlich', exact=True).fill('QA')
        await page.get_by_role('button', name='Speichern', exact=True).click()
        await expect(page.locator('.bug-detail')).to_contain_text('QA')
        await page.get_by_role('button', name='Vorkommen ergänzen', exact=True).click()
        await page.get_by_label('Laufentscheidung').select_option('KONTEXT_BEENDET')
        await page.get_by_role('button', name='Speichern', exact=True).click()
        await expect(page.locator('.bug-occurrence')).to_have_count(2)
        bugs = (await (await page.request.get(BASE+'/api/bugs')).json())['bugs']
        assert len(bugs) == 1 and bugs[0]['revision'] == 3
        rpc = await page.request.post(BASE+'/api/mcp', headers={'origin':BASE,'sec-fetch-site':'same-origin'}, data={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'bug_get','arguments':{'id':bugs[0]['id']}}})
        assert len((await rpc.json())['result']['structuredContent']['occurrences']) == 2
        hostile = await page.request.post(BASE+'/api/bugs',headers={'origin':'https://evil.example'},data={})
        assert hostile.status == 403
        clean = await browser.new_context()
        assert (await clean.request.get(BASE+'/api/bugs')).status == 401
        await clean.close()
        output = ROOT/'docs/screenshots'
        output.mkdir(exist_ok=True)
        await page.screenshot(path=str(output/'bug-board.png'),full_page=True)
        for path in ['/context','/legal','/missions']:
            await page.goto(BASE+path)
            await expect(page.locator('h1')).to_be_visible()
            await expect(page.get_by_role('link', name='Tradegazing Office Desk Startseite')).to_be_visible()
            assert 'This page couldn' not in await page.locator('body').inner_text()
        await page.screenshot(path=str(output/'mission-log.png'),full_page=True)
        await page.get_by_role('button', name='Dunklen Modus aktivieren').click()
        assert await page.locator('.logo-dark').evaluate('(img)=>img.complete&&img.naturalWidth>0')
        await page.screenshot(path=str(output/'mission-log-dark.png'),full_page=True)
        for width in [390,320]:
            await page.set_viewport_size({'width':width,'height':900})
            for path in ['/','/missions','/bugs','/context','/legal']:
                await page.goto(BASE+path)
                await expect(page.locator('h1')).to_be_visible()
                assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), (width,path)
            if width==390:
                await page.goto(BASE+'/bugs')
                await expect(page.get_by_role('heading', name='Bug Board',exact=True)).to_be_visible()
                await page.screenshot(path=str(output/'bug-board-mobile.png'),full_page=True)
        assert not errors, errors
        report={'mission_create_edit_reload':True,'bug_create_edit_occurrence':True,'rest_mcp_same_data':True,'auth_origin':True,'pages':['/','/missions','/bugs','/context','/legal'],'widths':[1280,390,320],'dark_logo':True,'page_errors':errors,'data_scope':'isolated QA instance only'}
        (ROOT/'docs/browser-smoke.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False))
        await browser.close()

asyncio.run(main())
