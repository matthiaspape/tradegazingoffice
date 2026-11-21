"use client";
import { useEffect, useState, type ReactNode } from 'react';
import DeskShell from '../../DeskShell';
import { demoOverview } from './unified-demo';
import type { Overview, Host, Fleet, Point } from './fleet-types';
import { BROWSER_POLL_MS, CATCHUP_DELAY_MS, CATCHUP_LIMIT, HEALTH_FRESH_SECONDS } from '../../../ops/fleet-timing.mjs';
import './unified.css';

const base='/controlling/fleet-control';
const stamp=(at:string|null)=>at?new Date(at).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}):'—';
const metricFormat=new Intl.NumberFormat('de-DE',{maximumFractionDigits:1});
const euroFormat=new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:'negative'});
// Broker wall time from the EA (no zone): shown as is.
const broker=(at:string|null)=>at?`${at.slice(8,10)}.${at.slice(5,7)}.${at.slice(0,4)}, ${at.slice(11,16)}`:'—';
const side=(s?:string)=>s==='BUY'?'Kauf':s==='SELL'?'Verkauf':'—';
const num=(v:number|null,suffix='')=>v===null?'—':`${metricFormat.format(v)}${suffix}`;
const bytes=(v:number|null)=>v===null?'—':`${num(v/1024**3)} GiB`;
function money(value:string|null,currency:string){
 if(value===null)return '—';
 if(currency==='EUR')return `${euroFormat.format(value as Intl.StringNumericLiteral)} EUR`;
 const [whole,fraction]=value.split('.');
 return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')}${fraction?','+fraction:''} ${currency}`;
}
function Chip({children,tone=''}:{children:ReactNode;tone?:string}){return <span className={`fc-chip ${tone}`}>{children}</span>;}
function Plot({points,label,currency='',now,range}:{points:Point[];label:string;currency?:string;now:number;range:number}){
 const slots=new Map<number,Point>();
 for(const p of points){const at=Date.parse(p.at);if(p.value!==null&&Number.isFinite(Number(p.value))&&at<=now&&at>=now-range*3600000)slots.set(Math.floor(at/300000),p);}
 const list=[...slots.entries()].sort((a,b)=>a[0]-b[0]);
 if(!list.length)return <div className="fc-empty">Noch kein belegter Verlauf.</div>;
 const vals=list.map(([,p])=>Number(p.value)),lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||1;
 const first=Date.parse(list[0][1].at),last=Date.parse(list.at(-1)![1].at),duration=last-first||1;
 const segments:string[][]=[];let segment:string[]=[];
 list.forEach(([slot,p],i)=>{if(i&&slot-list[i-1][0]>1){segments.push(segment);segment=[];}segment.push(`${10+(Date.parse(p.at)-first)/duration*780},${170-(Number(p.value)-lo)/span*145}`);});segments.push(segment);
 const formatValue=(value:string|null)=>currency==='%'?num(value===null?null:Number(value),' %'):money(value,currency);
 return <figure className="fc-plot"><svg viewBox="0 0 800 190" preserveAspectRatio="none" aria-hidden="true"><path className="fc-gridline" d="M0 25H800 M0 100H800 M0 170H800"/>{segments.map((s,i)=>s.length===1?<circle key={i} cx={s[0].split(',')[0]} cy={s[0].split(',')[1]} r="3"/>:<polyline key={i} points={s.join(' ')}/>)}</svg><figcaption><strong>{label}</strong><span>{stamp(list[0][1].at)} → {stamp(list.at(-1)![1].at)}</span><span>{formatValue(list[0][1].value)} → {formatValue(list.at(-1)![1].value)} · {list.length} Beobachtungen{segments.length>1?' · Messlücken':''}</span></figcaption></figure>;
}
function FleetValues({fleet,current}:{fleet:Fleet;current:boolean}){
 const rows=[['Konto-Balance',fleet.balance,'native Kontowährung'],['Konto-Equity',fleet.equity,'beobachteter Kontostand'],['Profit heute',fleet.profitToday,'Equity-Änderung seit Tagesbeginn · inkl. offener Bewertung'],['Unrealized PnL',fleet.unrealized,'offen · nicht gebucht']];
 return <dl className="fc-values">{rows.map(([label,value,note])=><div key={label}><dt>{label}</dt><dd>{current?money(value,fleet.currency):'—'}<small>{!current&&value!==null?`Zuletzt ${money(value,fleet.currency)}`:value===null?'Noch nicht belegt':note}</small></dd></div>)}</dl>;
}
function HostValues({host,current}:{host:Host;current:boolean}){
 const volumes=host.volumes.length?host.volumes:[{name:'',percent:null,total:null,used:null}];
 return <><dl className="fc-host-values"><div><dt>CPU-Last · 5-Min.-Mittel</dt><dd>{current?num(host.cpu,' %'):'—'}<small>{current?`Spitze ${num(host.cpuMax,' %')}`:`Zuletzt ${num(host.cpu,' %')}`}</small></dd></div><div><dt>RAM-Last · physisch</dt><dd>{current?num(host.ram.percent,' %'):'—'}<small>{current?'':'Zuletzt '}{bytes(host.ram.used)} / {bytes(host.ram.total)}</small></dd></div>{volumes.map(v=><div key={v.name}><dt>Festplatte {v.name} · belegt</dt><dd>{current?num(v.percent,' %'):'—'}<small>{current?'':'Zuletzt '}{bytes(v.used)} / {bytes(v.total)}</small></dd></div>)}</dl><p className="fc-muted">Beobachtet {stamp(host.observedAt)} · Hostproben {host.samples??'—'}/{host.expected??'—'} · CPU-Proben {host.cpuSamples??'—'}/{host.expected??'—'}</p></>;
}
export default function FleetControl({vpsId,fleetId}:{vpsId?:string;fleetId?:string}){
 const [mode,setMode]=useState<'NATIVE'|'DEMO'>('NATIVE'),[range,setRange]=useState(24),[data,setData]=useState<Overview|null>(null),[error,setError]=useState(''),[sessionExpired,setSessionExpired]=useState(false),[ready,setReady]=useState(false),[clock,setClock]=useState(Date.now());
 useEffect(()=>{
  const query=new URLSearchParams(location.search),demo=query.get('mode')==='demo';setMode(demo?'DEMO':'NATIVE');setRange(query.get('range')==='168'?168:24);
  let alive=true,sessionReady=false,inFlight=false;
  let retry:ReturnType<typeof setTimeout>|undefined;
  if(demo){setData(demoOverview());setReady(true);return()=>{alive=false;};}
  const refresh=async(attempt=0)=>{
   if(!alive||!sessionReady||inFlight)return;
   clearTimeout(retry);inFlight=true;
   try{
    const r=await fetch('/api/fleet-control/overview',{cache:'no-store'});
    if(r.status===401){
     sessionReady=false;
     if(alive){setSessionExpired(true);setError('Office-Sitzung abgelaufen. Bitte die Seite neu laden, um die VPS-Daten wieder abzurufen.');setReady(true);}
     return;
    }
    if(!r.ok)throw new Error('Fleet-Daten momentan nicht erreichbar.');
    const value:Overview=await r.json();
    if(alive){
     setData(value);setClock(Date.now());setError('');setReady(true);
     if(value.refreshing===true&&attempt<CATCHUP_LIMIT)retry=setTimeout(()=>refresh(attempt+1),CATCHUP_DELAY_MS);
    }
   }catch{if(alive){setError('Fleet-Daten momentan nicht erreichbar. Letzte Werte behalten ihre Originalzeiten.');setReady(true);}}
   finally{inFlight=false;}
  };
  fetch('/api/local/session',{method:'POST',headers:{'content-type':'application/json','x-desk-session':'1'},body:'{}'}).then(r=>{if(!r.ok)throw new Error();sessionReady=true;return refresh();}).catch(()=>{if(alive){setError('Lokale Office-Sitzung konnte nicht geöffnet werden. Bitte die Seite neu laden.');setReady(true);}});
  const resume=()=>{if(!document.hidden)void refresh();};
  document.addEventListener('visibilitychange',resume);
  const poll=setInterval(refresh,BROWSER_POLL_MS),tick=setInterval(()=>{setClock(Date.now());setData(previous=>previous&&Date.now()-Date.parse(previous.asOf)>7*86400000?null:previous);},30000);
  return()=>{alive=false;clearTimeout(retry);clearInterval(poll);clearInterval(tick);document.removeEventListener('visibilitychange',resume);};
 },[]);
 const now=mode==='DEMO'&&data?Date.parse(data.asOf):clock;
 const link=(path:string)=>`${path}?mode=${mode==='DEMO'?'demo':'native'}&range=${range}`;
 const fresh=(at:string|null,state:string,limit=HEALTH_FRESH_SECONDS)=>!error&&state==='CURRENT'&&(mode==='DEMO'||!!at&&(now-Date.parse(at)>=0&&now-Date.parse(at)<=limit*1000));
 const healthChip=(h:Host)=><Chip tone={fresh(h.observedAt,h.state)?'good':'warn'}>{fresh(h.observedAt,h.state)?'Health aktuell':'Health fehlt / veraltet'}</Chip>;
 const fleetChip=(f:Fleet)=><Chip tone={fresh(f.observedAt,f.state,f.freshSeconds)?'good':'warn'}>{fresh(f.observedAt,f.state,f.freshSeconds)?'Daten aktuell':'Daten fehlen / veraltet'}</Chip>;
 const detailStatus=(h:Host|undefined,f?:Fleet)=><div role="group" aria-label={f?'Flotten-Datenstatus':'VPS-Datenstatus'}>
  <div className="fc-badges">{f?fleetChip(f):h?healthChip(h):null}<Chip>Datenquelle: {mode==='DEMO'?'Fiktive Beispieldaten':'VPS-Daten'}</Chip></div>
  <p className="fc-muted">Verbindung: {sessionExpired?'nicht geprüft (Office-Sitzung abgelaufen)':error?'nicht geprüft (Office-Abruf fehlgeschlagen)':`${mode==='DEMO'?'fiktiv · ':''}${h?.connection==='CURRENT'?'aktuell':h?.connection==='STALE'?'veraltet':'nicht verfügbar'}`} · Letzter Backendabruf {stamp(h?.lastPull??null)}</p>
 </div>;
 const fleetCard=(f:Fleet)=><a key={f.id} className="fc-fleet" href={link(`${base}/${encodeURIComponent(f.id)}`)}>
  <div className="fc-fleet-head">
   <div className="fc-fleet-name">
    <h3>{f.name} <span aria-hidden="true">↗</span></h3>
    {f.subtitle&&<p className="fc-fleet-subtitle">{f.subtitle}</p>}
    <p>{f.broker} · {f.environment}</p>
   </div>
   <div className="fc-badges"><Chip>{f.status}</Chip>{fleetChip(f)}</div>
  </div>
  {f.sharedAccount&&<p className="fc-muted">Konto gesamt · geteilt · keine Flottensumme</p>}
  <FleetValues fleet={f} current={fresh(f.observedAt,f.state,f.freshSeconds)}/>
  <Plot points={f.series} label={f.sharedAccount?'Konto-Equity · geteilt':'Konto-Equity'} currency={f.currency} now={now} range={range}/>
  <p className="fc-muted">Beobachtet {stamp(f.observedAt)} · Flottendetails öffnen →</p>
 </a>;
 const hostCard=(h:Host)=><section className="fc-vps" key={h.id}><header className="fc-vps-head"><div><h2><a href={link(`/controlling/vps/${encodeURIComponent(h.id)}`)}>{h.name} →</a></h2><p className="fc-ip">IP {h.ip||'nicht hinterlegt'}</p></div>{healthChip(h)}</header><HostValues host={h} current={fresh(h.observedAt,h.state)}/>{h.issue&&<p className="fc-notice">{h.issue}</p>}{h.attention.map((a,i)=><p className="fc-notice" key={i}>{a}</p>)}{h.fleets.length?<div className="fc-fleet-grid">{h.fleets.map(fleetCard)}</div>:<p className="fc-empty">{h.waitingForEa?'Noch keine EA-Exportquellen angebunden. VPS-Health läuft unabhängig.':'Keine gebundenen Flotteneinsätze.'}{h.unboundAccounts>0?` ${h.unboundAccounts} Konten warten auf Flottenzuordnung.`:''}</p>}</section>;
 const host=data?.hosts.find(h=>h.id===vpsId),fleet=data?.hosts.flatMap(h=>h.fleets).find(f=>f.id===fleetId);
 const detail=vpsId?host?.name:fleetId?fleet?.name:undefined;
 const hostOfFleet=fleet?data?.hosts.find(h=>h.id===fleet.hostId):undefined;
 // Event journal state: loading, failed without data, or data (possibly stale) with its pull time.
 const journal=(f:Fleet,content:()=>ReactNode)=>f.eventsState==='AVAILABLE'?content()
  :f.eventsState==='STALE'?<><p className="fc-notice">Ereignisabruf fehlgeschlagen · zuletzt empfangen {stamp(f.eventsPulledAt??null)}</p>{content()}</>
  :f.eventsState==='FAILED'?<p className="fc-notice">Ereignisabruf fehlgeschlagen; noch kein Journal empfangen. Neuer Versuch beim nächsten Abruf.</p>
  :<p className="fc-empty">Ereignisjournal wird geladen …</p>;
 const table=(headers:string[],rows:ReactNode[][])=>rows.length?<div className="fc-table"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>:<p className="fc-empty">Noch keine belegten Daten für diesen Bereich.</p>;
 return <DeskShell current="fleet" className="fc-page" detail={detail} fleetMode={mode}>
  <header className="mission-hero fc-hero"><div>
   <p className="kicker">Controlling · {vpsId?'VPS-Detail':fleetId?'Flottendetail':'VPS & Flotten'}</p>
   <h1>{detail||'Fleet Control'}</h1>
   {fleet?.subtitle?<p className="fc-fleet-subtitle">{fleet.subtitle}</p>:<p>Alle VPS im Blick. Jede Flotte dort, wo sie läuft.</p>}
   {host?detailStatus(host):fleet?detailStatus(hostOfFleet,fleet):null}
  </div></header>
  <div className="fc-toolbar"><label>Datenquelle<select value={mode} onChange={e=>location.assign(`${base}?mode=${e.target.value==='DEMO'?'demo':'native'}&range=${range}`)}><option value="NATIVE">Vorhandene VPS-Daten</option><option value="DEMO">Fiktive Beispieldaten</option></select></label><label>Beobachtungsfenster<select value={range} onChange={e=>{const v=Number(e.target.value);setRange(v);const q=new URL(location.href);q.searchParams.set('range',String(v));history.replaceState(null,'',q);}}><option value="24">Letzte 24 Stunden</option><option value="168">Bis zu 7 Tage</option></select></label><p>Lesender Abruf alle 5 Minuten · Europe/Berlin</p></div>
  {mode==='DEMO'&&<p className="fc-notice fc-demo">Designbeispiele · vollständig fiktive Handels- und Hostdaten. Keine Liveverbindung.</p>}
  {error&&<p className="fc-notice" role="alert">{error} {sessionExpired&&<button type="button" onClick={()=>location.reload()}>Seite neu laden</button>}</p>}
  {(fleetId||vpsId)&&<a className="fc-back" href={link(base)}>← Alle VPS und Flotten</a>}
  {!ready?<p className="fc-empty" role="status">VPS-Daten werden geladen …</p>:!data?<p className="fc-empty">Noch kein lesbarer Datenstand verfügbar.</p>:vpsId&&!host||fleetId&&!fleet?<p className="fc-empty">Dieser Einsatz oder VPS ist in der ausgewählten Datenquelle nicht gebunden. Fehlende EA-Exporte erzeugen keine Demo-Flotte.</p>:host?<>
   <p className="fc-ip">IP {host.ip||'nicht hinterlegt'}</p><HostValues host={host} current={fresh(host.observedAt,host.state)}/>{host.issue&&<p className="fc-notice">{host.issue}</p>}{host.attention.map((a,i)=><p className="fc-notice" key={i}>{a}</p>)}
   <div className="fc-charts"><section className="fc-panel"><h2>CPU-Last</h2><Plot points={host.series.map(p=>({at:p.at,value:p.cpu===null?null:String(p.cpu)}))} label="Fünf-Minuten-Mittel" currency="%" now={now} range={range}/></section><section className="fc-panel"><h2>RAM-Last</h2><Plot points={host.series.map(p=>({at:p.at,value:p.ram===null?null:String(p.ram)}))} label="Physisch belegt · Endstand je Fenster" currency="%" now={now} range={range}/></section>{host.volumes.map(v=><section key={v.name} className="fc-panel"><h2>Festplatte {v.name}</h2><Plot points={host.series.map(p=>({at:p.at,value:p.volumes.find(w=>w.name===v.name)?.percent?.toString()??null}))} label="Belegter Anteil · Endstand je Fenster" currency="%" now={now} range={range}/></section>)}</div>
   <p className="fc-muted">Tatsächlich vorhandene Beobachtungen · bis zu 7 Tage · zusätzlich durch Quellenbudget begrenzt. Messlücken bleiben sichtbar.</p>
   <section className="fc-panel"><h2>MT5-Prozesse & Collector</h2>{table(['Zuordnung','PID / Prozessstart','CPU am VPS','Working Set / Privat'],host.processes.map(p=>[p.terminal||p.binding,`${p.pid??'—'} · ${stamp(p.startedAt)}`,num(p.cpu,' %'),`${bytes(p.workingSet)} / ${bytes(p.privateBytes)}`]))}</section><h2>Flotten auf {host.name}</h2>{host.fleets.length?<div className="fc-fleet-grid">{host.fleets.map(fleetCard)}</div>:<p className="fc-empty">Noch keine gebundenen EA-Exportquellen.</p>}
  </>:fleet?<>
   <p>{fleet.broker} · {fleet.environment} · <a href={link(`/controlling/vps/${encodeURIComponent(fleet.hostId)}`)}>{hostOfFleet?.name} →</a></p><div className="fc-badges"><Chip>{fleet.status}</Chip><Chip>{fleet.positionMode||'Positionsmodus unbekannt'}</Chip><Chip>{fleet.sharedAccount?'Konto gesamt · geteilt':'Native Kontowerte'}</Chip></div><FleetValues fleet={fleet} current={fresh(fleet.observedAt,fleet.state,fleet.freshSeconds)}/><section className="fc-panel fc-large"><h2>Konto-Equity</h2><Plot points={fleet.series} label="Native Konto-Equity einschließlich Cashfloweffekten" currency={fleet.currency} now={now} range={range}/></section>
   <nav className="fc-tabs" aria-label="Flottenbereiche"><a href="#variants">Varianten</a><a href="#risk">Risiko</a><a href="#journal">Offene Positionen</a><a href="#history">Positionshistorie</a><a href="#issues">Issues</a><a href="#source">Betrieb & Daten</a></nav>
   <section className="fc-panel" id="variants"><h2>Varianten</h2>{table(['Symbol / TF','Pool','Revision','Bereitschaft'],fleet.variants.map(v=>[`${v.symbol} / ${v.timeframe??'—'} Min.`,v.pool,v.revision,v.ready===null?'Unbekannt':v.ready?'Bereit':'Nicht bereit']))}</section>
   <section className="fc-panel" id="risk"><h2>Risiko & Pools</h2><p className="fc-muted">Autoritative Quellwerte · kein zwischen Pools verleihbarer Rahmen.</p>{table(['Pool','Gebundenes Stoprisiko U / C'],fleet.pools.map(p=>[p.name,`${p.used??'—'} / ${p.capacity??'—'}`]))}</section>
   <section className="fc-panel" id="journal"><h2>Offene Positionen</h2>{table(['Symbol / Position','Richtung · Volumen','Einstieg → aktuell','Aktueller SL / TP','Offener P/L','Stop-Risiko'],fleet.positions.map(p=>[`${p.symbol} / ${p.id}${p.owner==='FOREIGN'?' · fremd':''}`,`${side(p.side)} · ${p.volume??'—'}`,`${p.openPrice??'—'} → ${p.currentPrice??'—'}`,`${p.sl??'—'} / ${p.tp??'—'}`,money(p.profit??null,fleet.currency),money(p.stopRisk??null,fleet.currency)]))}<p className="fc-muted">Letzte Kontoaufnahme des EA · offener P/L ohne Swap · Stop-Risiko = Verlust bis zum aktuellen Stop.</p></section>
   <section className="fc-panel" id="history"><h2>Positionshistorie</h2>{journal(fleet,()=>table(['Geschlossen (Brokerzeit)','Symbol / Position','Richtung · Volumen','Erster Einstieg → letzter Ausstieg','Netto'],(fleet.history??[]).map(h=>[broker(h.closedAt),`${h.symbol} / ${h.id}`,`${side(h.side)} · ${h.volume??'—'}`,`${h.openPrice??'—'} → ${h.closePrice??'—'}`,money(h.net,fleet.currency)])))}<p className="fc-muted">Geschlossene Positionen aus den nativen Deals des EA im Aufbewahrungsfenster des VPS-Readers (7 Tage) · Netto inkl. Kommission, Swap und Gebühren.</p></section>
   <section className="fc-panel" id="issues"><h2>Issues</h2>{journal(fleet,()=>table(['Zeit','Schwere','Code','Mitglied / Symbol','Detail'],(fleet.issues??[]).map(i=>[stamp(i.at),i.severity||'—',i.code||'—',`${i.member??'—'} / ${i.symbol||'—'}`,`${i.detail}${i.repeats?` (+${i.repeats} unterdrückt)`:''}`])))}</section>
   <section className="fc-panel" id="source"><h2>Betrieb & Daten</h2><p>Einsatz {fleet.deploymentId} · beobachtet {stamp(fleet.observedAt)}</p>{fleet.reasons.map((r,i)=><p className="fc-notice" key={i}>{r}</p>)}</section>
  </>:data.hosts.length?data.hosts.map(hostCard):<p className="fc-empty">Noch keine VPS-Lesequelle eingerichtet. Die bestehende M650-Quelle kann serverseitig verbunden werden.</p>}
 </DeskShell>;
}
