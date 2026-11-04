'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- local full-page links */
import { FormEvent,useEffect,useRef,useState } from 'react';
import { BrandIdentity, ThemeToggle } from './BrandIdentity';
import DeskNav from './DeskNav';
import { ensureDeskSession } from './desk-client';
import { bugLevels,bugStatuses,bugDecisions,bugEvidenceStates,bugComponents,bugLabels } from '../ops/bug-contract.mjs';

type Draft={title:string;expected:string;actual:string;impact:string;severity:string;probability:string;risk:string;risk_reason:string;evidence_state:string;components:string[];scope:string;owner:string;status:string;deferral_reason:string;resolution:string;duplicate_of:string};
type Occurrence={mission_id:string;run_id:string;stage:string;version:string;context:string;evidence_ref:string;evidence_state:string;decision:string;reason:string;blocked_step:string;no_workaround:string};
type RecordedOccurrence=Occurrence&{id:number;bug_id:string;actor:string;created_at:string};
type Bug=Draft&{id:string;number:number;label:string;revision:number;created_at:string;updated_at:string;blocked?:boolean;occurrence_count?:number;current_occurrences:RecordedOccurrence[];occurrences?:RecordedOccurrence[];events?:{id:number;action:string;actor:string;created_at:string;snapshot:unknown}[]};
type Mission={id:string;mission_number:number;title:string};
type List={bugs:Bug[];total:number;has_more:boolean;summary:{open:number;blockers:number;high:number;deferred:number}};
const label=(value:string)=>(bugLabels as Record<string,string>)[value]||value;
const newBug=():Draft=>({title:'',expected:'',actual:'',impact:'',severity:'UNBEKANNT',probability:'UNBEKANNT',risk:'UNBEKANNT',risk_reason:'',evidence_state:'BEOBACHTET',components:[],scope:'',owner:'',status:'ZURUECKGESTELLT',deferral_reason:'',resolution:'',duplicate_of:''});
const newOccurrence=(mission_id=''):Occurrence=>({mission_id,run_id:'',stage:'',version:'',context:'',evidence_ref:'',evidence_state:'BEOBACHTET',decision:'WEITER',reason:'',blocked_step:'',no_workaround:''});
const timestamp=(value:string)=>new Date(value).toLocaleString('de-DE',{timeZone:'Europe/Berlin'});

function Select({title,value,values,onChange}:{title:string;value:string;values:string[];onChange:(value:string)=>void}) {
  return <label>{title}<select value={value} onChange={e=>onChange(e.target.value)}>{values.map(v=><option key={v} value={v}>{label(v)}</option>)}</select></label>;
}
function Text({title,value,onChange,required=false,maxLength=3000,short=false}:{title:string;value:string;onChange:(value:string)=>void;required?:boolean;maxLength?:number;short?:boolean}) {
  return <label>{title}{short?<input value={value} onChange={e=>onChange(e.target.value)} required={required} maxLength={maxLength}/>:<textarea value={value} onChange={e=>onChange(e.target.value)} required={required} maxLength={maxLength} rows={3}/>}</label>;
}
function OccurrenceFields({value,onChange,missions}:{value:Occurrence;onChange:(value:Occurrence)=>void;missions:Mission[]}) {
  const field=(key:keyof Occurrence)=>(v:string)=>onChange({...value,[key]:v});
  return <fieldset className="bug-fields"><legend>Vorkommen und konkrete Laufwirkung</legend>
    <label>Mission<select value={value.mission_id} onChange={e=>field('mission_id')(e.target.value)}><option value="">Allgemeiner Fehler / keine Mission</option>{value.mission_id&&!missions.some(m=>m.id===value.mission_id)&&<option value={value.mission_id}>{value.mission_id}</option>}{missions.map(m=><option key={m.id} value={m.id}>Mission {m.mission_number} · {m.title}</option>)}</select></label>
    <Text short title="Lauf / Run-ID" value={value.run_id} onChange={field('run_id')} maxLength={200} required={value.decision==='BLOCKIERT'}/>
    <Text short title="Betroffene Stufe" value={value.stage} onChange={field('stage')} maxLength={200} required={value.decision==='BLOCKIERT'}/>
    <Text short title="Version / Commit" value={value.version} onChange={field('version')} maxLength={200}/>
    <Text title="Kontext · Auftrag, Komponente, Konfiguration / optional Broker, Symbol, TF" value={value.context} onChange={field('context')} required/>
    <Text title="Belegreferenz · Logpfad, Bericht oder https://…" value={value.evidence_ref} onChange={field('evidence_ref')} maxLength={1500} required/>
    <Select title="Belegstatus dieses Vorkommens" value={value.evidence_state} values={bugEvidenceStates} onChange={field('evidence_state')}/>
    <Select title="Laufentscheidung" value={value.decision} values={bugDecisions} onChange={field('decision')}/>
    <Text title="Begründung / Einschränkung" value={value.reason} onChange={field('reason')} required/>
    {value.decision==='BLOCKIERT'&&<><Text title="Welcher notwendige Schritt / welches entscheidende Ergebnis ist blockiert?" value={value.blocked_step} onChange={field('blocked_step')} required/><Text title="Warum ist keine einfache sichere Fortsetzung möglich?" value={value.no_workaround} onChange={field('no_workaround')} required/></>}
    <p className="bug-hint">Nur belegte Blockaden dürfen im Suchlauf behoben werden. Mit Einschränkung weiterführen erlaubt keine Reparatur. Nach Laufende denselben Kontext als „Kontext beendet“ ergänzen.</p>
  </fieldset>;
}
function DraftFields({value,onChange}:{value:Draft;onChange:(value:Draft)=>void}) {
  const field=(key:keyof Draft)=>(v:string)=>onChange({...value,[key]:v});
  return <fieldset className="bug-fields"><legend>Befund und Risikoeinschätzung</legend>
    <Text title="Titel" value={value.title} onChange={field('title')} maxLength={160} required short/>
    <Text title="Verantwortlich" value={value.owner} onChange={field('owner')} maxLength={160} short/>
    <Text title="Erwartetes Verhalten" value={value.expected} onChange={field('expected')} required/>
    <Text title="Tatsächliches Verhalten" value={value.actual} onChange={field('actual')} required/>
    <Text title="Auswirkung" value={value.impact} onChange={field('impact')} required/>
    <Text title="Betroffener Bereich / Unsicherheiten" value={value.scope} onChange={field('scope')}/>
    <Select title="Kritikalität beim Auftreten" value={value.severity} values={bugLevels} onChange={field('severity')}/>
    <Select title="Eintrittswahrscheinlichkeit im Kontext" value={value.probability} values={bugLevels} onChange={field('probability')}/>
    <Select title="Gesamtrisiko" value={value.risk} values={bugLevels} onChange={field('risk')}/>
    <Select title="Belegstatus des Befunds" value={value.evidence_state} values={bugEvidenceStates} onChange={field('evidence_state')}/>
    <Text title="Begründung des Gesamtrisikos" value={value.risk_reason} onChange={field('risk_reason')} required/>
    <label>Betroffene / vermutete Komponenten<div className="bug-components">{[...new Set([...bugComponents,...value.components])].map(c=><label key={c}><input type="checkbox" checked={value.components.includes(c)} onChange={e=>onChange({...value,components:e.target.checked?[...value.components,c]:value.components.filter(x=>x!==c)})}/>{c}</label>)}</div></label>
    <Select title="Status" value={value.status} values={bugStatuses} onChange={field('status')}/>
    <Text title="Grund der Zurückstellung" value={value.deferral_reason} onChange={field('deferral_reason')} required={value.status==='ZURUECKGESTELLT'}/>
    {['ERLEDIGT','KEIN_FEHLER'].includes(value.status)&&<Text title="Abschlussbeleg / Begründung" value={value.resolution} onChange={field('resolution')} required/>}
    {value.status==='DUPLIKAT'&&<Text short title="ID des ursprünglichen Bugs" value={value.duplicate_of} onChange={field('duplicate_of')} required maxLength={160}/>}
  </fieldset>;
}
export function BugTable({bugs,onSelect}:{bugs:Bug[];onSelect:(id:string)=>void}) {
  return <div className="bug-table-wrap"><table className="bug-table"><thead><tr><th>Bug / Befund</th><th>Gesamtrisiko</th><th>Aktuelle Laufwirkung</th><th>Komponenten</th><th>Status</th></tr></thead><tbody>{bugs.map(b=><tr key={b.id}><td><button className="bug-link" onClick={()=>onSelect(b.id)}><small>{b.label}</small><strong>{b.title}</strong></button><small>{b.occurrence_count} Vorkommen</small></td><td><span className={`bug-badge risk-${b.risk.toLowerCase()}`}>{label(b.risk)}</span></td><td>{b.current_occurrences.length?b.current_occurrences.map(o=><div key={o.id} className={o.decision==='BLOCKIERT'?'bug-blocked':''}>{label(o.decision)}<small>{o.run_id||'Allgemeiner Kontext'}{o.stage&&` · ${o.stage}`}</small></div>):'Keine aktuellen Vorkommen'}</td><td>{b.components.join(' · ')}</td><td>{label(b.status)}</td></tr>)}</tbody></table></div>;
}
export function BugDetail({bug,missions}:{bug:Bug;missions:Mission[]}) {
  return <>
    <div className="bug-detail-heading"><div><p className="eyebrow">{bug.label} · Revision {bug.revision}</p><h2>{bug.title}</h2></div><span className={`bug-badge risk-${bug.risk.toLowerCase()}`}>{label(bug.risk)}</span></div>
    <dl className="bug-detail-grid">{[['Erwartet',bug.expected],['Beobachtet',bug.actual],['Auswirkung',bug.impact],['Risikobegründung',bug.risk_reason],['Kritikalität',label(bug.severity)],['Wahrscheinlichkeit',label(bug.probability)],['Belegstatus',label(bug.evidence_state)],['Komponenten',bug.components.join(' · ')],['Kontext / Unsicherheit',bug.scope||'Nicht angegeben'],['Status',label(bug.status)],['Verantwortlich',bug.owner||'Offen'],['Zurückstellung',bug.deferral_reason||'Nicht angegeben']].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    {bug.resolution&&<p>Abschluss: {bug.resolution}</p>}{bug.duplicate_of&&<p>Ursprünglicher Bug: <a href={`/bugs?id=${encodeURIComponent(bug.duplicate_of)}`}>{bug.duplicate_of}</a></p>}
    <h3>Vorkommen und Neubewertungen</h3>
    {(bug.occurrences||[]).map(o=><article className="bug-occurrence" key={o.id}><header><strong>{label(o.decision)}</strong><span>{timestamp(o.created_at)}</span></header><p>{o.context}</p><p>{o.reason}</p><small>{label(o.evidence_state)} · {o.run_id||'Ohne Run-ID'} · {o.stage||'Ohne Stufe'} · {o.version||'Version nicht angegeben'}</small>{o.blocked_step&&<p>Blockierter Schritt: {o.blocked_step}<br/>Keine einfache Fortsetzung: {o.no_workaround}</p>}<p>Beleg: <code>{o.evidence_ref}</code></p>{o.mission_id&&<a href={missions.some(m=>m.id===o.mission_id)?`/missions#mission-${missions.find(m=>m.id===o.mission_id)!.mission_number}`:`/bugs?mission_id=${encodeURIComponent(o.mission_id)}`}>Mission {missions.find(m=>m.id===o.mission_id)?.mission_number||o.mission_id} ↗</a>}<small>Erfasst von {o.actor}{o.bug_id!==bug.id&&` · über Duplikat ${o.bug_id}`}</small></article>)}
    <details className="bug-history"><summary>Änderungsverlauf · {bug.events?.length||0} Ereignisse</summary>{bug.events?.map(e=><article key={e.id}><p>{e.action} · {e.actor} · {timestamp(e.created_at)}</p><details><summary>Gespeicherter Stand</summary><pre>{JSON.stringify(e.snapshot,null,2)}</pre></details></article>)}</details>
  </>;
}

export default function BugBoard() {
  const [filters,setFilters]=useState({q:'',risk:'',status:'',component:'',mission_id:'',decision:''});
  const [offset,setOffset]=useState(0),[data,setData]=useState<List|null>(null),[detail,setDetail]=useState<Bug|null>(null),[selected,setSelected]=useState('');
  const [missions,setMissions]=useState<Mission[]>([]),[mode,setMode]=useState<'list'|'create'|'edit'|'occurrence'>('list');
  const [draft,setDraft]=useState(newBug),[occurrence,setOccurrence]=useState(newOccurrence),[error,setError]=useState(''),[missionError,setMissionError]=useState('');
  const [sessionReady,setSessionReady]=useState(false);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0),[initialized,setInitialized]=useState(false);
  const [editBase,setEditBase]=useState<{id:string;revision:number}|null>(null);
  const submission=useRef<{signature:string;key:string}|null>(null);
  useEffect(()=>{
    const sync=()=>{const p=new URLSearchParams(window.location.search);setFilters(f=>({...f,mission_id:p.get('mission_id')||''}));setSelected(p.get('id')||'');setInitialized(true);};
    sync();window.addEventListener('popstate',sync);
    ensureDeskSession().then(()=>{setSessionReady(true);return fetch('/api/missions');}).then(async r=>{if(!r.ok)throw Error('Missionen konnten nicht geladen werden.');return r.json();}).then(p=>setMissions(p.missions)).catch(e=>{setMissionError(e.message);setError(e.message);setLoading(false);});
    return ()=>window.removeEventListener('popstate',sync);
  },[]);
  useEffect(()=>{
    if(!initialized||!sessionReady)return;
    const abort=new AbortController(),p=new URLSearchParams();
    for(const [k,v] of Object.entries(filters))if(v)p.set(k,v);
    p.set('offset',String(offset));p.set('limit','50');setLoading(true);setError('');
    fetch(`/api/bugs?${p}`,{signal:abort.signal}).then(async r=>{const p=await r.json();if(!r.ok)throw Error(p.error||'Bug Board konnte nicht geladen werden.');return p;}).then(setData).catch(e=>{if(e.name!=='AbortError'){setError(e.message);setData(null);}}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[filters,offset,refresh,initialized,sessionReady]);
  useEffect(()=>{
    if(!selected||!sessionReady){setDetail(null);return;}
    const abort=new AbortController();setDetail(null);
    fetch(`/api/bugs?id=${encodeURIComponent(selected)}`,{signal:abort.signal}).then(async r=>{const p=await r.json();if(!r.ok)throw Error(p.error||'Bug konnte nicht geladen werden.');return p;}).then(setDetail).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return ()=>abort.abort();
  },[selected,refresh,sessionReady]);
  function select(id:string){setSelected(id);setMode('list');const p=new URLSearchParams();if(filters.mission_id)p.set('mission_id',filters.mission_id);if(id)p.set('id',id);window.history.pushState(null,'',`/bugs${p.size?`?${p}`:''}`);}
  function filter(key:keyof typeof filters,value:string){setFilters(f=>({...f,[key]:value}));setOffset(0);}
  async function save(event:FormEvent) {
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try {
      if(mode!=='create'&&!detail)throw Error('Bugdetail wird neu geladen. Bitte erneut öffnen.');
      if(mode==='edit'&&(!editBase||editBase.id!==detail?.id))throw Error('Bitte den Bug erneut zur Bearbeitung öffnen.');
      const cleanDraft={...draft,duplicate_of:draft.status==='DUPLIKAT'?draft.duplicate_of:''};
      const method=mode==='create'?'POST':mode==='edit'?'PATCH':'PUT';
      const body=mode==='create'?{bug:cleanDraft,occurrence}:mode==='edit'?{id:editBase!.id,expected_revision:editBase!.revision,patch:cleanDraft}:{id:detail!.id,occurrence};
      const signature=JSON.stringify({method,body});
      if(submission.current?.signature!==signature)submission.current={signature,key:crypto.randomUUID()};
      const response=await fetch('/api/bugs',{method,headers:{'content-type':'application/json'},body:JSON.stringify({...body,request_key:submission.current.key})});
      const payload=await response.json();if(!response.ok)throw Error(payload.error||'Speichern fehlgeschlagen.');
      submission.current=null;select(payload.id);setRefresh(v=>v+1);
    }catch(e){setError(e instanceof Error?e.message:'Speichern fehlgeschlagen.');}finally{setBusy(false);}
  }
  return <main className="mission-page bug-page"><header className="topbar"><BrandIdentity section="Projektmanagement"/><span className="local-badge"><i/>Lokal · Office</span><ThemeToggle/></header><DeskNav current="bugs"/>
    <section className="bug-hero"><div><p className="eyebrow">Befunde behalten. Suche fortsetzen.</p><h1>Bug Board</h1><p>Nur Bugs, die den konkreten Lauf blockieren, dürfen während der Suche behoben werden. Alle anderen werden hier erfasst und zurückgestellt.</p></div><button onClick={()=>{setDraft(newBug());setOccurrence(newOccurrence(filters.mission_id));setMode('create');setError('');}} disabled={busy}>+ Bug erfassen</button></section>
    <p className="bug-policy">Ein hohes Risiko allein erlaubt keine Reparatur. Laufentscheidung und Status starten keine Prozesse und ändern keine Freigaben.</p>
    {missionError&&<p role="status" className="bug-hint">{missionError} Allgemeine Erfassung bleibt möglich.</p>}
    {error&&<div role="alert" className="bug-error">{error}<button onClick={()=>{setMode('list');setEditBase(null);setRefresh(v=>v+1);}}>Neu laden · Entwurf verwerfen</button></div>}
    {mode!=='list'&&<form className="bug-editor" onSubmit={save}><header><h2>{mode==='create'?'Neuen Bug erfassen':mode==='edit'?`${detail?.label} bearbeiten`:'Vorkommen / Neubewertung ergänzen'}</h2><button type="button" disabled={busy} onClick={()=>setMode('list')}>Abbrechen</button></header>{mode!=='occurrence'&&<DraftFields value={draft} onChange={setDraft}/>} {mode!=='edit'&&<OccurrenceFields value={occurrence} onChange={setOccurrence} missions={missions}/>}<button disabled={busy}>{busy?'Speichert …':'Speichern'}</button></form>}
    <section className="bug-metrics" aria-label="Kennzahlen der gefilterten Auswahl">{[['Offene Bugs',data?.summary.open],['Offene Blocker',data?.summary.blockers],['Offene hohe Risiken',data?.summary.high],['Zurückgestellt',data?.summary.deferred]].map(([k,v])=><article key={String(k)}><span>{k}</span><strong>{loading?'…':v??'—'}</strong></article>)}</section>
    <section className="bug-filters" aria-label="Bugs filtern"><label>Suche<input value={filters.q} maxLength={200} placeholder="ID, Titel, Befund …" onChange={e=>filter('q',e.target.value)}/></label>{([['risk','Gesamtrisiko',bugLevels],['status','Status',bugStatuses],['component','Komponente',[...new Set([...bugComponents,...(data?.bugs.flatMap(b=>b.components)||[])])]],['decision','Laufwirkung',bugDecisions]] as [keyof typeof filters,string,string[]][]).map(([key,title,values])=><Select key={key} title={title} value={filters[key]} values={['',...values]} onChange={v=>filter(key,v)}/>)}<label>Mission<select value={filters.mission_id} onChange={e=>filter('mission_id',e.target.value)}><option value="">Alle Missionen</option>{filters.mission_id&&!missions.some(m=>m.id===filters.mission_id)&&<option value={filters.mission_id}>{filters.mission_id}</option>}{missions.map(m=><option key={m.id} value={m.id}>Mission {m.mission_number} · {m.title}</option>)}</select></label></section>
    {loading?<p role="status">Bug Board wird geladen …</p>:data&&<>{data.total?<><BugTable bugs={data.bugs} onSelect={select}/><div className="bug-pagination"><span>{offset+1}–{Math.min(offset+50,data.total)} von {data.total} Bugs</span><button disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-50))}>Zurück</button><button disabled={!data.has_more} onClick={()=>setOffset(v=>v+50)}>Weiter</button></div></>:<div className="bug-empty"><h2>Keine Bugs in dieser Auswahl</h2><p>Neue Befunde mit Beleg und Einschätzung erfassen. Bekannte Bugs über die Suche finden und um weitere Vorkommen ergänzen.</p></div>}</>}
    {selected&&!detail&&<p role="status">Bugdetail wird geladen …</p>}
    {detail&&<section className="bug-detail"><div className="bug-actions"><button onClick={()=>{const d=newBug();for(const key of Object.keys(d) as (keyof Draft)[])Object.assign(d,{[key]:detail[key]});setDraft(d);setEditBase({id:detail.id,revision:detail.revision});setMode('edit');}} disabled={busy}>Bewertung bearbeiten</button><button onClick={()=>{const current=detail.current_occurrences.find(o=>!filters.mission_id||o.mission_id===filters.mission_id);setOccurrence(current?Object.fromEntries(Object.keys(newOccurrence()).map(k=>[k,current[k as keyof Occurrence]||''])) as Occurrence:newOccurrence(filters.mission_id));setMode('occurrence');}} disabled={busy||detail.status==='DUPLIKAT'}>Vorkommen ergänzen</button><button onClick={()=>select('')}>Detail schließen</button></div><BugDetail bug={detail} missions={missions}/></section>}
  </main>;
}
