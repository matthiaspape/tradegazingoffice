// Local concept only. All hosts, values, curves and states are fictitious.
const content = document.getElementById('content');
let scenario = 'demo';
const hosts = [
  {id:'atlas',name:'Atlas VPS',ip:'192.0.2.10',cpu:38,ram:'6,1 / 12 GiB',ramPct:51,disk:'64 / 160 GiB',diskPct:40},
  {id:'borealis',name:'Borealis VPS',ip:'198.51.100.20',cpu:78,ram:'7,3 / 8 GiB',ramPct:91,disk:'85 / 100 GiB',diskPct:85}
];
const fleets = [
  {id:'nova',host:'atlas',name:'Nova',broker:'Beispielbroker A',status:'Active',tone:'good',balance:'100.500 €',equity:'100.840 €',profit:'+280 €',open:'+340 €',time:'11:55',values:[48,52,43,55,49,62,58,69,72,67,80],ends:'100.420 € → 100.840 €'},
  {id:'vega',host:'atlas',name:'Vega',broker:'Beispielbroker B',status:'Inaktive',tone:'',balance:'50.000 €',equity:'50.000 €',profit:'−65 €',open:'0 €',time:'11:55',values:[64,58,60,51,54,46,48,48,48,48,48],ends:'50.065 € → 50.000 €'},
  {id:'orion',host:'borealis',name:'Orion',broker:'Beispielbroker A',status:'Failure',tone:'bad',balance:'80.120 €',equity:'79.980 €',profit:'−180 €',open:'−140 €',time:'11:25',stale:true,values:[66,72,60,50,57,null,42,49,37,40,28],ends:'80.410 € → 79.980 €'}
];
const badge = (text,tone='')=>`<span class="badge ${tone}">${text}</span>`;
function curve(values,caption,ends) {
  const pieces=[];let segment=[];
  values.forEach((v,i)=>{if(v==null){if(segment.length)pieces.push(segment);segment=[];}else segment.push(`${i*30},${80-v*.75}`);});
  if(segment.length)pieces.push(segment);
  return `<figure class="chart"><svg viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="300" y1="70" y2="70"/>${pieces.map(p=>`<polyline points="${p.join(' ')}"/>`).join('')}</svg><figcaption><span>${caption}</span><span>${ends}</span></figcaption></figure>`;
}
function fleetMetrics(f,detail=false) {
  const fields=[['Konto-Balance',f.balance,'Native Kontowährung'],['Konto-Equity',f.equity,'Beobachteter Stand'],['Profit heute',f.profit,'heute gebucht · netto'],['Unrealized PnL',f.open,'offen · nicht gebucht']];
  return `<dl class="${detail?'detail-metrics':''}">${fields.map(([label,value,note])=>`<div><dt>${label}</dt><dd>${f.stale?'—':value}<small class="metric-note">${f.stale?`Zuletzt ${value} · ${f.time}`:note}</small></dd></div>`).join('')}</dl>`;
}
function fleetCard(f) {
  return `<a class="fleet" href="#fleet/${f.id}" aria-label="${f.name} · Flottendetails öffnen"><div class="fleet-top"><div><h3>${f.name} <span aria-hidden="true">↗</span></h3><p class="broker">${f.broker} · Demo · ${f.id}-01</p></div><div class="badges">${badge(`${f.stale?'Zuletzt ':''}${f.status}`,f.tone)}${f.stale?badge('Daten veraltet','warn'):''}</div></div>${fleetMetrics(f)}${curve(f.values,`Konto-Equity · ${f.stale?'letzter Verlauf bis 11:25':'24 h bis 11:55'}`,f.ends+(f.stale?' · Lücke 23:55–00:05':''))}<div class="fleet-bottom"><span>${f.stale?'Letzter belegter Stand':'Beobachtet'} ${f.time} Uhr</span><span>Details →</span></div></a>`;
}
function hostMetrics(h) {
  return `<dl class="host-metrics"><div><dt>CPU-Last · 5-Min.-Mittel</dt><dd>${h.cpu} %</dd><div class="meter"><span style="width:${h.cpu}%"></span></div></div><div><dt>RAM-Last · belegt / gesamt</dt><dd>${h.ramPct} % <small>${h.ram}</small></dd><div class="meter"><span style="width:${h.ramPct}%"></span></div></div><div><dt>Festplatte C: · belegt / gesamt</dt><dd>${h.diskPct} % <small>${h.disk}</small></dd><div class="meter"><span style="width:${h.diskPct}%"></span></div></div></dl>`;
}
const scope = ()=>'<div class="scope"><span>Demo</span><span>EUR</span><span>14.11.2026 · Europe/Berlin</span><span>Vergleichsstand 11:55 Uhr</span></div>';
function hostCard(h) {
  const members = fleets.filter(f=>f.host===h.id);
  return `<section class="vps" aria-labelledby="host-${h.id}"><div class="vps-head"><div><h2 class="vps-title" id="host-${h.id}"><a href="#vps/${h.id}">${h.name} →</a></h2><div class="address">IP ${h.ip}</div></div><div class="badges">${badge('Health aktuell','good')}${h.id==='borealis'?badge('RAM-Reserve knapp','warn'):''}</div></div>${hostMetrics(h)}<p class="host-note">Hostmessung 11:55 · CPU-Fenster 11:50–11:55 · 20/20 Hostproben, 20/20 CPU-Proben</p>${scenario==='waiting'?'<div class="empty">Noch keine EA-Exportquellen angebunden. VPS-Health ist verfügbar; Flottenwerte folgen mit dem EA.</div>':`<div class="fleet-grid">${members.map(fleetCard).join('')}</div>`}</section>`;
}
function overview() {
  return `<div class="heading"><div><div class="eyebrow">Deine Flotten. Ihr Zuhause.</div><h1>Fleet Control</h1></div>${badge('Abruf alle 5 Minuten')}</div><p class="lead">Alle VPS im Blick. Jede Flotte dort, wo sie läuft.</p>${scope()}<div class="controls"><label for="scenario">Vorschauzustand<select id="scenario"><option value="demo" ${scenario==='demo'?'selected':''}>Flotten mit Beispieldaten</option><option value="waiting" ${scenario==='waiting'?'selected':''}>Ohne EA-Exporte · Hostdaten vorhanden</option></select></label></div>${scenario==='demo'?'<p class="notice">Orion: letzter belegter Status Failure um 11:25 Uhr. Aktueller Betriebszustand unbekannt · Daten veraltet. Host-Health bleibt aktuell.</p>':'<p class="notice">Wartet auf EA-Exporte · Keine erfundenen Flotten oder Handelssalden.</p>'}${hosts.map(hostCard).join('')}`;
}
function vpsDetail(h) {
  return `<a class="back" href="#overview">← Alle VPS und Flotten</a><div class="heading"><div><div class="eyebrow">VPS-Detail</div><h1>${h.name}</h1><p class="address">IP ${h.ip}</p></div>${badge('Health aktuell','good')}</div>${scope()}${hostMetrics(h)}<p class="host-note">20/20 Hostproben · 20/20 CPU-Proben · letztes Fenster 11:50–11:55</p><div class="chart-grid"><section class="panel large"><h2>CPU-Last</h2>${curve([-8,1,-4,5,-6,0,7,-4,2,0,0].map(v=>h.cpu+v),'Fünf-Minuten-Mittel · 11:00–11:55',`Minimum ${h.cpu-8} % · Maximum der Mittelwerte ${h.cpu+7} %`)}<p class="muted">Je Fenster stehen Mittel, beobachtete Spitze und Abdeckung im Detail zur Verfügung. Beispielkurve.</p></section><section class="panel large"><h2>RAM-Last</h2>${curve([-5,-2,-4,-1,0,-1,-2,-1,1,-1,0].map(v=>h.ramPct+v),'Beobachteter Verbrauch · 11:00–11:55',`Beispielverlauf · letzter Stand ${h.ramPct} %`)}<p class="muted">Physisch belegt und Reserve; Commit/Limit als getrennte Messgröße.</p></section></div><section class="panel large"><h2>Festplattenverbrauch · C:</h2>${curve([-2,-2,-2,-1,-1,-1,0,0,0,0,0].map(v=>h.diskPct+v),'Belegter Anteil am Volume · 11:00–11:55',`Beispielverlauf · letzter Stand ${h.diskPct} %`)}<p class="muted">Weitere Volumes, freier Platz und vorhandene I/O-Messungen stehen hier getrennt.</p></section><section class="panel"><h2>MT5-Prozesse &amp; Collector</h2><p class="muted">Beispielzuordnungen · Prozessstart und Terminalbindung gehören zum Nachweis.</p><div class="table-wrap"><table><thead><tr><th>Prozess / Bindung</th><th>PID / Start</th><th>CPU am VPS</th><th>Working Set</th><th>Privater Speicher</th></tr></thead><tbody><tr><td>MT5 · terminal-demo · gebunden</td><td>4120 · 12.11. 08:00</td><td>8,2 %</td><td>620 MiB</td><td>510 MiB</td></tr><tr><td>Collector · eigenes Verfahren</td><td>4080 · 12.11. 07:55</td><td>0,4 %</td><td>68 MiB</td><td>52 MiB</td></tr></tbody></table></div></section><section><h2>Flotten auf ${h.name}</h2><p class="muted">Die Flottenkarte öffnet den zugehörigen Einsatz.</p>${scenario==='waiting'?'<p class="empty">Noch keine EA-Exportquellen angebunden.</p>':`<div class="fleet-grid">${fleets.filter(f=>f.host===h.id).map(fleetCard).join('')}</div>`}</section>`;
}
function fleetDetail(f) {
  const host=hosts.find(h=>h.id===f.host);
  return `<a class="back" href="#overview">← Alle VPS und Flotten</a><div class="heading"><div><div class="eyebrow">Flottendetail · Einsatz ${f.id}-01</div><h1>${f.name}</h1><p class="broker">${f.broker} · <a href="#vps/${host.id}">${host.name} →</a></p></div><div class="badges">${badge(`${f.stale?'Zuletzt ':''}${f.status}`,f.tone)}${badge(f.stale?'Daten veraltet':'Daten aktuell',f.stale?'warn':'good')}</div></div>${scope()}${f.stale?'<p class="notice">Letzter belegter Stand 11:25 Uhr. Aktueller Betriebszustand unbekannt. Aktuelle Zahlen sind offen; letzte Werte stehen getrennt darunter.</p>':`<p class="muted">1 Flotteneinsatz · 1 Konto · native Konto-Equity · beobachtet ${f.time} Uhr</p>`}${fleetMetrics(f,true)}<section class="panel large"><h2>Konto-Equity</h2>${curve(f.values,`24-Stunden-Fenster · 13.11. 11:55 bis 14.11. ${f.time}`,f.ends+(f.stale?' · Lücke 23:55–00:05':''))}<p class="muted">Native Kontokurve einschließlich Cashfloweffekten · ausschließlich beobachtete Punkte · Beispieldaten.</p></section><nav class="tabs" aria-label="Flottenregister"><a href="#fleet/${f.id}/variants">Varianten</a><a href="#fleet/${f.id}/risk">Risiko</a><a href="#fleet/${f.id}/journal">Journal</a><a href="#fleet/${f.id}/data">Betrieb &amp; Daten</a></nav><section class="panel" id="extra"><h2>Ergebnis und Betrieb</h2><p class="muted">Profit heute zeigt heute gebuchtes Handelsnetto. Unrealized PnL zeigt die noch nicht gebuchte offene Bewertung. Tagesgesamtergebnis berücksichtigt zusätzlich die offene Bewertung am Tagesstart.</p><p class="muted">${f.status==='Inaktive'?'Vega ist ausdrücklich inaktiv. Keine offenen Verwaltungsaufgaben im Beispiel.':f.status==='Failure'?'Orion meldete um 11:25 einen kritischen Verwaltungsfehler. Ein neuer Status liegt nicht vor.':'Nova bestätigt Kernfortschritt und erforderliche Positionsverwaltung im Beispiel.'}</p></section>`;
}
function extra(f,tab) {
  const sections={variants:['Varianten','Strategielinien, Revisionen und Poolbindung bleiben gemäß Fachkonzept erhalten. Keine Originaldaten in dieser Vorschau.'],risk:['Risiko','Autoritatives U/C, UNKNOWN und auslaufende Verpflichtungen stehen getrennt von nativer Konto-Margin. Keine Originaldaten in dieser Vorschau.'],journal:['Journal','Positionen, Deals und vollständige Tradezyklen werden getrennt geführt. Das Journal benennt Abdeckung und Cursorablauf. Keine Originaldaten in dieser Vorschau.'],data:['Betrieb & Daten','Host, Terminal, Konto, Einsatz und Quelle bleiben explizit gebunden. Brokerverbindung, Kernfortschritt und Datenfrische sind getrennte Signale.']};
  const s=sections[tab];
  return `<a class="back" href="#fleet/${f.id}">← ${f.name} · Überblick</a><div class="eyebrow">Flottendetail · ${f.name}</div><h1>${s[0]}</h1>${scope()}<div class="panel"><p>${s[1]}</p><p class="muted">Konzeptanschluss · kein vollständiges Journal oder neuer Datenanschluss.</p></div>`;
}
function render(focus=false) {
  const [kind,id,tab]=(location.hash.slice(1)||'overview').split('/');
  const h=hosts.find(h=>h.id===id),f=fleets.find(f=>f.id===id);
  if(kind==='overview')content.innerHTML=overview();
  else if(kind==='vps'&&h)content.innerHTML=vpsDetail(h);
  else if(kind==='fleet'&&f&&tab&&['variants','risk','journal','data'].includes(tab))content.innerHTML=extra(f,tab);
  else if(kind==='fleet'&&f&&!tab)content.innerHTML=fleetDetail(f);
  else if(kind==='project')content.innerHTML='<div class="eyebrow">Projektmanagement</div><h1>Im Tradegazing Office</h1><p class="lead">Mission Log, Context Core, Bug Board und Legal &amp; Lizenzen bleiben im bestehenden Office Desk. Diese Designstudie bildet keine Projektformulare nach.</p><a class="back" href="#overview">← Fleet Control</a>';
  else content.innerHTML='<h1>Ansicht nicht gefunden</h1><a class="back" href="#overview">← Fleet Control</a>';
  if(focus){content.focus();window.scrollTo(0,0);}
}
document.addEventListener('change',e=>{if(e.target.id==='scenario'){scenario=e.target.value;render();document.getElementById('scenario').focus();}});
document.getElementById('theme').addEventListener('click',e=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';e.target.textContent=dark?'Dunkelmodus':'Hellmodus';e.target.setAttribute('aria-label',dark?'Zum Dunkelmodus wechseln':'Zum Hellmodus wechseln');});
window.addEventListener('hashchange',()=>render(true));render();
