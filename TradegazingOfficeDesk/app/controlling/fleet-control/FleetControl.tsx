"use client";
import { useEffect, useState, type ReactNode } from 'react';
import DeskShell from '../../DeskShell';
import { demoOverview } from './unified-demo';
import type { Overview, Host, Fleet, Point } from './fleet-types';
import './unified.css';

const base='/controlling/fleet-control';
const stamp=(at:string|null)=>at?new Date(at).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}):'—';
const num=(v:number|null,suffix='')=>v===null?'—':`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(v)}${suffix}`;
const bytes=(v:number|null)=>v===null?'—':`${num(v/1024**3)} GiB`;
function money(value:string|null,currency:string){
 if(value===null)return '—';
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
 return <figure className="fc-plot"><svg viewBox="0 0 800 190" preserveAspectRatio="none" aria-hidden="true"><path className="fc-gridline" d="M0 25H800 M0 100H800 M0 170H800"/>{segments.map((s,i)=>s.length===1?<circle key={i} cx={s[0].split(',')[0]} cy={s[0].split(',')[1]} r="3"/>:<polyline key={i} points={s.join(' ')}/>)}</svg><figcaption><strong>{label}</strong><span>{stamp(list[0][1].at)} → {stamp(list.at(-1)![1].at)}</span><span>{money(list[0][1].value,currency)} → {money(list.at(-1)![1].value,currency)} · {list.length} Beobachtungen{segments.length>1?' · Messlücken':''}</span></figcaption></figure>;
}
function FleetValues({fleet,current}:{fleet:Fleet;current:boolean}){
 const rows=[['Konto-Balance',fleet.balance,'native Kontowährung'],['Konto-Equity',fleet.equity,'beobachteter Kontostand'],['Profit heute',fleet.profitToday,'heute gebucht · netto'],['Unrealized PnL',fleet.unrealized,'offen · nicht gebucht']];
 return <dl className="fc-values">{rows.map(([label,value,note])=><div key={label}><dt>{label}</dt><dd>{current?money(value,fleet.currency):'—'}<small>{!current&&value!==null?`Zuletzt ${money(value,fleet.currency)}`:value===null?'Noch nicht belegt':note}</small></dd></div>)}</dl>;
}
function HostValues({host,current}:{host:Host;current:boolean}){
 const volumes=host.volumes.length?host.volumes:[{name:'',percent:null,total:null,used:null}];
 return <><dl className="fc-host-values"><div><dt>CPU-Last · 5-Min.-Mittel</dt><dd>{current?num(host.cpu,' %'):'—'}<small>{current?`Spitze ${num(host.cpuMax,' %')}`:`Zuletzt ${num(host.cpu,' %')}`}</small></dd></div><div><dt>RAM-Last · physisch</dt><dd>{current?num(host.ram.percent,' %'):'—'}<small>{current?'':'Zuletzt '}{bytes(host.ram.used)} / {bytes(host.ram.total)}</small></dd></div>{volumes.map(v=><div key={v.name}><dt>Festplatte {v.name} · belegt</dt><dd>{current?num(v.percent,' %'):'—'}<small>{current?'':'Zuletzt '}{bytes(v.used)} / {bytes(v.total)}</small></dd></div>)}</dl><p className="fc-muted">Beobachtet {stamp(host.observedAt)} · Hostproben {host.samples??'—'}/{host.expected??'—'} · CPU-Proben {host.cpuSamples??'—'}/{host.expected??'—'}</p></>;
}
export default function FleetControl({vpsId,fleetId}:{vpsId?:string;fleetId?:string}){
 const [mode,setMode]=useState<'NATIVE'|'DEMO'>('NATIVE'),[range,setRange]=useState(24),[data,setData]=useState<Overview|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[clock,setClock]=useState(Date.now());
 useEffect(()=>{
  const query=new URLSearchParams(location.search),demo=query.get('mode')==='demo';setMode(demo?'DEMO':'NATIVE');setRange(query.get('range')==='168'?168:24);
  let alive=true;
  if(demo){setData(demoOverview());setReady(true);return()=>{alive=false;};}
  const refresh=async()=>{try{const r=await fetch('/api/fleet-control/overview',{cache:'no-store'});if(!r.ok)throw new Error('Fleet-Daten momentan nicht erreichbar.');const value=await r.json();if(alive){setData(value);setError('');setReady(true);}}catch{if(alive){setError('Fleet-Daten momentan nicht erreichbar. Letzte Werte behalten ihre Originalzeiten.');setReady(true);}}};
  fetch('/api/local/session',{method:'POST',headers:{'content-type':'application/json','x-desk-session':'1'},body:'{}'}).then(r=>{if(!r.ok)throw new Error();return refresh();}).catch(()=>{if(alive){setError('Lokale Office-Sitzung konnte nicht geöffnet werden. Bitte die Seite neu laden.');setReady(true);}});
  const poll=setInterval(refresh,300000),tick=setInterval(()=>{setClock(Date.now());setData(previous=>previous&&Date.now()-Date.parse(previous.asOf)>7*86400000?null:previous);},30000);
  return()=>{alive=false;clearInterval(poll);clearInterval(tick);};
 },[]);
 const now=mode==='DEMO'&&data?Date.parse(data.asOf):clock;
 const link=(path:string)=>`${path}?mode=${mode==='DEMO'?'demo':'native'}&range=${range}`;
 const fresh=(at:string|null,state:string,limit=600)=>!error&&state==='CURRENT'&&(mode==='DEMO'||!!at&&(now-Date.parse(at)>=0&&now-Date.parse(at)<=limit*1000));
 const fleetCard=(f:Fleet)=><a key={f.id} className="fc-fleet" href={link(`${base}/${encodeURIComponent(f.id)}`)}><div className="fc-fleet-head"><div><h3>{f.name} <span aria-hidden="true">↗</span></h3><p>{f.broker} · {f.environment}</p></div><div className="fc-badges"><Chip>{f.status}</Chip><Chip tone={fresh(f.observedAt,f.state,f.freshSeconds)?'good':'warn'}>{fresh(f.observedAt,f.state,f.freshSeconds)?'Daten aktuell':'Daten fehlen / veraltet'}</Chip></div></div>{f.sharedAccount&&<p className="fc-muted">Konto gesamt · geteilt · keine Flottensumme</p>}<FleetValues fleet={f} current={fresh(f.observedAt,f.state,f.freshSeconds)}/><Plot points={f.series} label={f.sharedAccount?'Konto-Equity · geteilt':'Konto-Equity'} currency={f.currency} now={now} range={range}/><p className="fc-muted">Beobachtet {stamp(f.observedAt)} · Flottendetails öffnen →</p></a>;
 const hostCard=(h:Host)=><section className="fc-vps" key={h.id}><header className="fc-vps-head"><div><h2><a href={link(`/controlling/vps/${encodeURIComponent(h.id)}`)}>{h.name} →</a></h2><p className="fc-ip">IP {h.ip||'nicht hinterlegt'}</p></div><Chip tone={fresh(h.observedAt,h.state)?'good':'warn'}>{fresh(h.observedAt,h.state)?'Health aktuell':'Health fehlt / veraltet'}</Chip></header><HostValues host={h} current={fresh(h.observedAt,h.state)}/>{h.issue&&<p className="fc-notice">{h.issue}</p>}{h.attention.map((a,i)=><p className="fc-notice" key={i}>{a}</p>)}{h.fleets.length?<div className="fc-fleet-grid">{h.fleets.map(fleetCard)}</div>:<p className="fc-empty">{h.waitingForEa?'Noch keine EA-Exportquellen angebunden. VPS-Health läuft unabhängig.':'Keine gebundenen Flotteneinsätze.'}{h.unboundAccounts>0?` ${h.unboundAccounts} Konten warten auf Flottenzuordnung.`:''}</p>}</section>;
 const host=data?.hosts.find(h=>h.id===vpsId),fleet=data?.hosts.flatMap(h=>h.fleets).find(f=>f.id===fleetId);
 const detail=vpsId?host?.name:fleetId?fleet?.name:undefined;
 const hostOfFleet=fleet?data?.hosts.find(h=>h.id===fleet.hostId):null;
 const table=(headers:string[],rows:ReactNode[][])=>rows.length?<div className="fc-table"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>:<p className="fc-empty">Noch keine belegten Daten für diesen Bereich.</p>;
 return <DeskShell current="fleet" className="fc-page" detail={detail} fleetMode={mode}>
  <header className="mission-hero fc-hero"><div><p className="kicker">Controlling · {vpsId?'VPS-Detail':fleetId?'Flottendetail':'VPS & Flotten'}</p><h1>{detail||'Fleet Control'}</h1><p>Alle VPS im Blick. Jede Flotte dort, wo sie läuft.</p></div></header>
  <div className="fc-toolbar"><label>Datenquelle<select value={mode} onChange={e=>location.assign(`${base}?mode=${e.target.value==='DEMO'?'demo':'native'}&range=${range}`)}><option value="NATIVE">Vorhandene VPS-Daten</option><option value="DEMO">Fiktive Beispieldaten</option></select></label><label>Beobachtungsfenster<select value={range} onChange={e=>{const v=Number(e.target.value);setRange(v);const q=new URL(location.href);q.searchParams.set('range',String(v));history.replaceState(null,'',q);}}><option value="24">Letzte 24 Stunden</option><option value="168">Bis zu 7 Tage</option></select></label><p>Lesender Abruf alle 5 Minuten · Europe/Berlin</p></div>
  {mode==='DEMO'&&<p className="fc-notice fc-demo">Designbeispiele · vollständig fiktive Handels- und Hostdaten. Keine Liveverbindung.</p>}
  {error&&<p className="fc-notice" role="alert">{error}</p>}
  {(fleetId||vpsId)&&<a className="fc-back" href={link(base)}>← Alle VPS und Flotten</a>}
  {!ready?<p className="fc-empty" role="status">VPS-Daten werden geladen …</p>:!data?<p className="fc-empty">Noch kein lesbarer Datenstand verfügbar.</p>:vpsId&&!host||fleetId&&!fleet?<p className="fc-empty">Dieser Einsatz oder VPS ist in der ausgewählten Datenquelle nicht gebunden. Fehlende EA-Exporte erzeugen keine Demo-Flotte.</p>:host?<>
   <p className="fc-ip">IP {host.ip||'nicht hinterlegt'} · Letzter Backendabruf {stamp(host.lastPull)}</p><HostValues host={host} current={fresh(host.observedAt,host.state)}/>{host.issue&&<p className="fc-notice">{host.issue}</p>}{host.attention.map((a,i)=><p className="fc-notice" key={i}>{a}</p>)}
   <div className="fc-charts"><section className="fc-panel"><h2>CPU-Last</h2><Plot points={host.series.map(p=>({at:p.at,value:p.cpu===null?null:String(p.cpu)}))} label="Fünf-Minuten-Mittel" currency="%" now={now} range={range}/></section><section className="fc-panel"><h2>RAM-Last</h2><Plot points={host.series.map(p=>({at:p.at,value:p.ram===null?null:String(p.ram)}))} label="Physisch belegt · Endstand je Fenster" currency="%" now={now} range={range}/></section>{host.volumes.map(v=><section key={v.name} className="fc-panel"><h2>Festplatte {v.name}</h2><Plot points={host.series.map(p=>({at:p.at,value:p.volumes.find(w=>w.name===v.name)?.percent?.toString()??null}))} label="Belegter Anteil · Endstand je Fenster" currency="%" now={now} range={range}/></section>)}</div>
   <p className="fc-muted">Tatsächlich vorhandene Beobachtungen · bis zu 7 Tage · zusätzlich durch Quellenbudget begrenzt. Messlücken bleiben sichtbar.</p>
   <section className="fc-panel"><h2>MT5-Prozesse & Collector</h2>{table(['Zuordnung','PID / Prozessstart','CPU am VPS','Working Set / Privat'],host.processes.map(p=>[p.terminal||p.binding,`${p.pid??'—'} · ${stamp(p.startedAt)}`,num(p.cpu,' %'),`${bytes(p.workingSet)} / ${bytes(p.privateBytes)}`]))}</section><h2>Flotten auf {host.name}</h2>{host.fleets.length?<div className="fc-fleet-grid">{host.fleets.map(fleetCard)}</div>:<p className="fc-empty">Noch keine gebundenen EA-Exportquellen.</p>}
  </>:fleet?<>
   <p>{fleet.broker} · {fleet.environment} · <a href={link(`/controlling/vps/${encodeURIComponent(fleet.hostId)}`)}>{hostOfFleet?.name} →</a></p><div className="fc-badges"><Chip>{fleet.status}</Chip><Chip>{fleet.positionMode||'Positionsmodus unbekannt'}</Chip><Chip>{fleet.sharedAccount?'Konto gesamt · geteilt':'Native Kontowerte'}</Chip></div><FleetValues fleet={fleet} current={fresh(fleet.observedAt,fleet.state,fleet.freshSeconds)}/><section className="fc-panel fc-large"><h2>Konto-Equity</h2><Plot points={fleet.series} label="Native Konto-Equity einschließlich Cashfloweffekten" currency={fleet.currency} now={now} range={range}/></section>
   <nav className="fc-tabs" aria-label="Flottenbereiche"><a href="#variants">Varianten</a><a href="#risk">Risiko</a><a href="#journal">Journal</a><a href="#source">Betrieb & Daten</a></nav>
   <section className="fc-panel" id="variants"><h2>Varianten</h2>{table(['Symbol / TF','Pool','Revision','Bereitschaft'],fleet.variants.map(v=>[`${v.symbol} / ${v.timeframe??'—'} Min.`,v.pool,v.revision,v.ready===null?'Unbekannt':v.ready?'Bereit':'Nicht bereit']))}</section>
   <section className="fc-panel" id="risk"><h2>Risiko & Pools</h2><p className="fc-muted">Autoritative Quellwerte · kein zwischen Pools verleihbarer Rahmen.</p>{table(['Pool','Gebundenes Stoprisiko U / C'],fleet.pools.map(p=>[p.name,`${p.used??'—'} / ${p.capacity??'—'}`]))}</section>
   <section className="fc-panel" id="journal"><h2>Offene Positionen</h2>{table(['Symbol / Position','Volumen','Aktueller SL / TP'],fleet.positions.map(p=>[`${p.symbol} / ${p.id}`,p.volume??'—',`${p.sl??'—'} / ${p.tp??'—'}`]))}<p className="fc-muted">Letzte Kontoaufnahme. Vollständiges Originaljournal und qualifizierte Tagesprojektion benötigen den passenden EA-Export.</p></section>
   <section className="fc-panel" id="source"><h2>Betrieb & Daten</h2><p>Einsatz {fleet.deploymentId} · beobachtet {stamp(fleet.observedAt)}</p>{fleet.reasons.map((r,i)=><p className="fc-notice" key={i}>{r}</p>)}</section>
  </>:data.hosts.length?data.hosts.map(hostCard):<p className="fc-empty">Noch keine VPS-Lesequelle eingerichtet. Die bestehende M650-Quelle kann serverseitig verbunden werden.</p>}
 </DeskShell>;
}
