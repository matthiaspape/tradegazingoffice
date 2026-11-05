"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import DeskShell from '../DeskShell';
import { projectDocumentUrl } from '../evidence-links';
import { ensureDeskSession, invokeDeskTool } from '../desk-client';
import { browserModelContext, registerMissionTools } from '../webmcp';
import { contextKinds, contextTopics, contextStatuses, sourceTypes } from '../../ops/context-contract.mjs';

import { LEGAL_TAG, rightsStatuses, rightsStatus, isLegal, legalTemplate, legalKnowledgeStatuses } from '../../ops/legal-contract.mjs';

const labels = (entry: { tags: string[] }) => isLegal(entry) ? legalKnowledgeStatuses : contextStatuses;
type Kind = keyof typeof contextKinds;
type Topic = keyof typeof contextTopics;
type Status = keyof typeof contextStatuses;
type Source = { type: keyof typeof sourceTypes; label: string; ref: string };
type Entry = { id: string; key: string; title: string; summary: string; content: string; kind: Kind; topic: Topic; status: Status; tags: string[]; sources: Source[]; confirmation_note: string; is_core: boolean; superseded_by: string | null; version: number; created_at: string; updated_at: string };
type Summary = Omit<Entry, 'content' | 'sources' | 'confirmation_note'> & { source_count: number };
type Revision = { version: number; snapshot: Entry; change_reason: string; author: string; created_at: string };
type Detail = { entry: Entry; revisions: Revision[]; history_total: number; next_history_offset: number | null };
type Mission = { id: string; title: string; mission_number: number };
type Page = { entries: Summary[]; total: number; next_offset: number | null };
type Group = { entries: Summary[]; total: number; truncated: boolean };
type Overview = { core: Group; confirmed: Group; proposals: Group; open_questions: Group };
type Filters = { query: string; topic: string; status: string; mission_id: string; legal_status: string };
type Draft = { key: string; title: string; summary: string; content: string; kind: Kind; topic: Topic; status: Status; tags: string; sources: Source[]; confirmation_note: string; is_core: boolean; superseded_by: string | null; change_reason: string };
const message = (error: unknown) => error instanceof Error ? error.message : 'Die Anfrage konnte nicht verarbeitet werden.';
const stamp = (date: string) => new Date(date).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'short' });

function Sources({ sources, missions }: { sources: Source[]; missions: Mission[] }) {
  return <ul className="context-sources">{sources.map((source, i) => {
    const mission = source.type === 'MISSION' ? missions.find(m => m.id === source.ref) : undefined;
    return <li key={i}><small>{sourceTypes[source.type]}</small>
      {mission ? <a href={`/missions?mission=${mission.mission_number}`}>{source.label} ↗</a> : source.type === 'WEB' ? <a href={source.ref} target="_blank" rel="noreferrer">{source.label} ↗</a> : source.type === 'DOCUMENT' && projectDocumentUrl(source.ref) ? <a href={projectDocumentUrl(source.ref)!} target="_blank" rel="noreferrer">{source.label} ↗</a> : <b>{source.label}</b>}
      {source.type !== 'MISSION' && <span>{source.ref}</span>}
    </li>;
  })}</ul>;
}
function EntryBody({ entry, missions }: { entry: Entry; missions: Mission[] }) {
  return <>
    <div className="context-meta"><span className={`context-status ${entry.status.toLowerCase()}`}>{labels(entry)[entry.status]}</span><span>{contextKinds[entry.kind]} · {contextTopics[entry.topic]}</span>{entry.is_core && <span>Im Projektüberblick</span>}</div>
    <p className="context-lead">{entry.summary}</p>
    {isLegal(entry) && <p className="notice"><b>{rightsStatuses[rightsStatus(entry) as keyof typeof rightsStatuses]}</b> · Gilt nur für den dokumentierten Einsatz und Prüfstand.</p>}
    {entry.content && <p className="context-content">{entry.content}</p>}
    {entry.confirmation_note && <div className="context-confirmation"><b>Grundlage der Bestätigung</b><p>{entry.confirmation_note}</p></div>}
    {entry.tags.length > 0 && <p className="context-tags">{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</p>}
    <h3>Herkunft</h3><Sources sources={entry.sources} missions={missions} />
  </>;
}
function Editor({ entry, missions, successors, onSaved, onClose, legal = false }: { legal?: boolean; entry: Entry | null; missions: Mission[]; successors: Summary[]; onSaved: (entry: Entry) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => entry ? { key: entry.key, title: entry.title, summary: entry.summary, content: entry.content, kind: entry.kind, topic: entry.topic, status: entry.status, tags: entry.tags.join(', '), sources: entry.sources, confirmation_note: entry.confirmation_note, is_core: entry.is_core, superseded_by: entry.superseded_by, change_reason: '' } : {
    key: `${legal ? 'legal' : 'wissen'}-${crypto.randomUUID()}`, title: '', summary: '', content: legal ? legalTemplate : '', kind: legal ? 'REFERENCE' : 'DECISION', topic: 'PROJECT', status: 'PROPOSED', tags: legal ? `${LEGAL_TAG}, RIGHTS-OPEN` : '',
    sources: [{ type: 'MISSION', ref: '', label: '' }], confirmation_note: '', is_core: false, superseded_by: null, change_reason: '',
  });
  const legalEntry = legal || Boolean(entry && isLegal(entry));
  const draftTags = draft.tags.split(',').map(t => t.trim()).filter(Boolean);
  const selectedRight = rightsStatus({ tags: draftTags });
  const knowledgeLabels = legalEntry ? legalKnowledgeStatuses : contextStatuses;
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const change = (patch: Partial<Draft>) => setDraft(current => ({ ...current, ...patch }));
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { key, ...fields } = draft;
      const payload = { ...fields, tags: draft.tags.split(',').map(t => t.trim()).filter(Boolean) };
      const { superseded_by, ...createPayload } = payload;
      const result = await invokeDeskTool(entry ? 'update_context_entry' : 'create_context_entry', entry ? { ...payload, entry_id: entry.id, expected_version: entry.version } : { ...createPayload, key });
      onSaved(result.entry);
    } catch (error) { setError(message(error)); } finally { setSaving(false); }
  }
  return <form onSubmit={save} className="context-form">
    <header><h2>{legalEntry ? (entry ? 'Registereintrag bearbeiten' : 'Lizenz oder Rechtsfrage erfassen') : (entry ? 'Wissen bearbeiten' : 'Wissen festhalten')}</h2><button type="button" onClick={onClose} disabled={saving}>Abbrechen</button></header>
    <fieldset disabled={saving}>
      <label>Titel<input required maxLength={120} value={draft.title} onChange={e => change({ title: e.target.value })} /></label>
      <div className="context-two-fields"><label>Wissensart<select value={draft.kind} onChange={e => { const kind = e.target.value as Kind; change({ kind, ...(kind === 'QUESTION' ? { status: 'OPEN', is_core: false, confirmation_note: '' } : draft.status === 'OPEN' ? { status: 'PROPOSED' } : {}) }); }}>{Object.entries(contextKinds).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label>Thema<select value={draft.topic} onChange={e => change({ topic: e.target.value as Topic })}>{Object.entries(contextTopics).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div>
      <label>Kurzfassung<textarea required maxLength={500} value={draft.summary} onChange={e => change({ summary: e.target.value })} placeholder="Welche Aussage soll ein neuer Chat kennen?" /></label>
      <label>{legalEntry ? 'Lizenz, Einsatz, Nachweise und Klärungsnotizen' : 'Erläuterung (optional)'}<textarea maxLength={4000} value={draft.content} onChange={e => change({ content: e.target.value })} placeholder="Begründung und Grenzen. Ausführliche Konzepte unter Herkunft verlinken." /></label>
      <div className="context-two-fields"><label>Status<select value={draft.status} onChange={e => { const status = e.target.value as Status; change({ status, ...(status !== 'CONFIRMED' ? { is_core: false, confirmation_note: '' } : {}), ...(status !== 'SUPERSEDED' ? { superseded_by: null } : {}) }); }}>{Object.entries(knowledgeLabels).filter(([key]) => (entry || key !== 'SUPERSEDED') && (draft.kind === 'QUESTION' ? ['OPEN', 'SUPERSEDED'].includes(key) : key !== 'OPEN')).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label>Tags<input value={draft.tags} onChange={e => change({ tags: e.target.value })} placeholder="Konzept, Wirtschaft, Prototyp" /></label></div>
      {legalEntry && <label>Rechteprüfung<select value={selectedRight} onChange={e => change({ tags: [...draftTags.filter(t => !Object.hasOwn(rightsStatuses, t) && t !== LEGAL_TAG), LEGAL_TAG, e.target.value].join(', ') })}>{Object.entries(rightsStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><small>„Dokumentierter Stand“ bestätigt die Angaben, nicht automatisch die Nutzungsrechte. Für belegte Rechte Einsatz und Nachweise ausdrücklich nennen.</small></label>}
      {draft.status === 'CONFIRMED' && <>
        <label>Grundlage der Bestätigung<textarea required maxLength={1000} value={draft.confirmation_note} onChange={e => change({ confirmation_note: e.target.value })} placeholder="Wann und wodurch wurde diese Aussage bestätigt?" /></label>
        <label className="context-checkbox"><input type="checkbox" checked={draft.is_core} onChange={e => change({ is_core: e.target.checked })} /> Im Projektüberblick für neue Chats zeigen</label>
      </>}
      {draft.status === 'SUPERSEDED' && <div className="context-retire"><p>Der Eintrag bleibt mit seinem Verlauf erhalten und erscheint künftig nur noch unter „Überholt“. Diese Fassung kann anschließend nicht weiter bearbeitet werden.</p><label>Gültiger Nachfolger (optional)<select value={draft.superseded_by || ''} onChange={e => change({ superseded_by: e.target.value || null })}><option value="">Ohne Nachfolger zurückziehen</option>{successors.filter(s => s.id !== entry?.id).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label></div>}
      <section className="context-source-editor"><h3>Herkunft</h3>
        {draft.sources.map((source, index) => {
          const update = (patch: Partial<Source>) => change({ sources: draft.sources.map((item, i) => i === index ? { ...item, ...patch } : item) });
          return <fieldset key={index}><legend>Quelle {index + 1}</legend><div className="context-two-fields">
            <label>Quellenart<select value={source.type} onChange={e => update({ type: e.target.value as Source['type'], ref: '', label: '' })}>{Object.entries(sourceTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Bezeichnung<input required maxLength={160} value={source.label} onChange={e => update({ label: e.target.value })} /></label></div>
            {source.type === 'MISSION' ? <label>Mission<select required value={source.ref} onChange={e => update({ ref: e.target.value, label: missions.find(m => m.id === e.target.value)?.title || '' })}><option value="">Mission auswählen …</option>{missions.map(m => <option key={m.id} value={m.id}>{String(m.mission_number).padStart(2, '0')} · {m.title}</option>)}</select></label> : <label>{source.type === 'WEB' ? 'Webadresse' : source.type === 'DOCUMENT' ? 'Pfad der Projektdatei' : 'Nutzeraussage mit Gespräch und Datum'}<input required maxLength={1000} type={source.type === 'WEB' ? 'url' : 'text'} value={source.ref} onChange={e => update({ ref: e.target.value })} placeholder={source.type === 'DOCUMENT' ? 'docs/FleetControlDeskKonzept.md' : undefined} /></label>}
            {draft.sources.length > 1 && <button type="button" onClick={() => change({ sources: draft.sources.filter((_, i) => i !== index) })}>Quelle entfernen</button>}
          </fieldset>;
        })}
        {draft.sources.length < 8 && <button type="button" onClick={() => change({ sources: [...draft.sources, { type: 'MISSION', ref: '', label: '' }] })}>+ Weitere Quelle</button>}
      </section>
      <label>{entry ? 'Warum wird der Eintrag geändert?' : 'Warum wird dieses Wissen festgehalten?'}<textarea required maxLength={1000} value={draft.change_reason} onChange={e => change({ change_reason: e.target.value })} placeholder="Diese Begründung wird im Änderungsverlauf gespeichert." /></label>
      <button className="context-primary" type="submit">{saving ? 'Speichert …' : legalEntry ? 'Registereintrag speichern' : 'Wissen speichern'}</button>
    </fieldset>
    {error && <p role="alert" className="error">{error}</p>}
  </form>;
}

export default function ContextCore({ legal = false }: { legal?: boolean }) {
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ query: '', topic: '', status: 'CURRENT', mission_id: '', legal_status: '' });
  const [page, setPage] = useState<Page>({ entries: [], total: 0, next_offset: null }), [offset, setOffset] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null), [missions, setMissions] = useState<Mission[]>([]), [successors, setSuccessors] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null), [editing, setEditing] = useState(false), [creating, setCreating] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const listRequest = useRef(0), detailRequest = useRef(0);
  const loadDetail = useCallback(async (id: string) => {
    const request = ++detailRequest.current;
    setEditing(false); setCreating(false); setDetail(null); setDetailLoading(true); setError('');
    try { const result = await invokeDeskTool('get_context_entry', { entry_id: id }); if (request === detailRequest.current) { if (legal && !isLegal(result.entry)) throw new Error('Dieser Eintrag gehört zum Context Core, nicht zum Legal-Register.'); setDetail(result); } }
    catch (error) { if (request === detailRequest.current) setError(message(error)); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  }, [legal]);
  const refresh = useCallback(async () => {
    const request = ++listRequest.current;
    setLoading(true);
    try {
      const active = { ...filters, tag: legal ? LEGAL_TAG : undefined, legal_status: filters.legal_status || undefined, ...(filters.topic ? {} : { topic: undefined }), ...(filters.mission_id ? {} : { mission_id: undefined }) };
      const [list, context] = await Promise.all([invokeDeskTool('list_context_entries', { ...active, limit: 30, offset }), legal ? Promise.resolve(null) : invokeDeskTool('get_project_context', { limit: 8 })]);
      const confirmed: Summary[] = []; let position: number | null = 0;
      do { const result = await invokeDeskTool('list_context_entries', { status: 'CONFIRMED', tag: legal ? LEGAL_TAG : undefined, limit: 100, offset: position }); confirmed.push(...result.entries); position = result.next_offset; } while (position !== null);
      if (request === listRequest.current) { setPage(list); setOverview(context); setSuccessors(confirmed); }
    } catch (error) { if (request === listRequest.current) setError(message(error)); }
    finally { if (request === listRequest.current) setLoading(false); }
  }, [filters, offset, legal]);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const mission = params.get('mission'); if (mission) setFilters(current => ({ ...current, mission_id: mission }));
    ensureDeskSession().then(async () => {
      const all: Mission[] = []; let position: number | null = 0;
      do { const result = await invokeDeskTool('list_missions', { limit: 100, offset: position }); all.push(...result.missions); position = result.next_offset; } while (position !== null);
      if (active) { setMissions(all); setReady(true); if (params.get('entry')) void loadDetail(params.get('entry')!); }
    }).catch(error => { if (active) { setError(message(error)); setLoading(false); } });
    return () => { active = false; listRequest.current++; detailRequest.current++; };
  }, [loadDetail]);
  useEffect(() => { if (ready) { const timer = setTimeout(() => void refresh(), 180); return () => clearTimeout(timer); } }, [ready, refresh]);
  useEffect(() => { if (ready) return registerMissionTools(browserModelContext(), invokeDeskTool, refresh); }, [ready, refresh]);
  const filter = (patch: Partial<Filters>) => { setFilters(current => ({ ...current, ...patch })); setOffset(0); setError(''); };
  function showOverview() { detailRequest.current++; setDetail(null); setEditing(false); setCreating(false); setDetailLoading(false); }
  function saved(entry: Entry) {
    setCreating(false); setEditing(false); setNotice(legal ? 'Registereintrag gespeichert. Belege und Änderungsverlauf bleiben erhalten.' : 'Wissen gespeichert. Herkunft und Änderungsverlauf sind hinterlegt.');
    void loadDetail(entry.id); void refresh();
  }
  async function older() {
    if (!detail || detail.next_history_offset === null) return;
    const current = detail, request = detailRequest.current;
    try {
      const result = await invokeDeskTool('get_context_entry', { entry_id: current.entry.id, history_offset: current.next_history_offset });
      if (request === detailRequest.current) {
        if (result.entry.version !== current.entry.version) { setError('Der Eintrag wurde geändert. Bitte den aktuellen Stand laden.'); return; }
        setDetail({ ...current, revisions: [...current.revisions, ...result.revisions], next_history_offset: result.next_history_offset });
      }
    } catch (error) { setError(message(error)); }
  }
  return <DeskShell current={legal ? "legal" : "context"} className="context-page">
    <section className="context-heading"><div><p className="kicker">{legal ? "Herkunft · Nutzungsrechte · offene Fragen" : "Gemeinsames Projektwissen"}</p><h1>{legal ? "Legal & Lizenzen" : "Context Core"}</h1></div><div><button onClick={showOverview}>{legal ? "Registerübersicht" : "Projektüberblick"}</button><button className="context-primary" disabled={!ready} onClick={() => { showOverview(); setCreating(true); setNotice(''); }}>{legal ? "+ Lizenz / Frage erfassen" : "+ Wissen festhalten"}</button></div></section>
    {error && <p className="error" role="alert">{error} <button onClick={() => window.location.reload()}>Seite neu laden</button></p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <section className="context-filters" aria-label="Wissen filtern">
      <label>{legal ? "Register durchsuchen" : "Wissen suchen"}<input type="search" value={filters.query} onChange={e => filter({ query: e.target.value })} placeholder="Begriff, Entscheidung oder Quelle …" /></label>
      <label>Thema<select value={filters.topic} onChange={e => filter({ topic: e.target.value })}><option value="">Alle Themen</option>{Object.entries(contextTopics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Status<select value={filters.status} onChange={e => filter({ status: e.target.value })}><option value="CURRENT">Aktueller Stand</option>{Object.entries(legal ? legalKnowledgeStatuses : contextStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="ALL">Auch überholte Einträge</option></select></label>
      {legal && <label>Rechteprüfung<select value={filters.legal_status} onChange={e => filter({ legal_status: e.target.value })}><option value="">Alle Prüfstände</option>{Object.entries(rightsStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
    </section>
    {filters.mission_id && <p className="context-mission-filter">Wissen zu {missions.find(m => m.id === filters.mission_id)?.title || 'dieser Mission'} <button onClick={() => filter({ mission_id: '' })}>Missionsfilter entfernen</button></p>}
    <div className="context-layout">
      <section className="context-index" aria-label="Wissenseinträge" aria-busy={loading}>
        <header><h2>{legal ? "Lizenz- und Fragenregister" : "Wissenssammlung"}</h2><span>{loading ? 'Lädt …' : `${page.total} Einträge`}</span></header>
        {page.entries.map(entry => <button className={`context-index-entry${detail?.entry.id === entry.id ? ' selected' : ''}`} key={entry.id} onClick={() => void loadDetail(entry.id)} aria-pressed={detail?.entry.id === entry.id}>
          <span className="context-meta"><span className={`context-status ${entry.status.toLowerCase()}`}>{labels(entry)[entry.status]}</span><span>{contextTopics[entry.topic]}</span></span>
          <b>{entry.title}</b>{isLegal(entry) && <strong>{rightsStatuses[rightsStatus(entry) as keyof typeof rightsStatuses]}</strong>}<span>{entry.summary}</span><small>{entry.source_count} {entry.source_count === 1 ? 'Quelle' : 'Quellen'} · Fassung {entry.version}</small>
        </button>)}
        {!loading && !page.entries.length && <p className="context-empty">Keine passenden Einträge. Passe die Suche an oder halte neues Wissen fest.</p>}
        <div className="context-pagination"><button disabled={!offset || loading} onClick={() => setOffset(Math.max(0, offset - 30))}>Zurück</button><button disabled={page.next_offset === null || loading} onClick={() => setOffset(page.next_offset!)}>Weitere</button></div>
      </section>
      <section className="context-reading" aria-busy={detailLoading}>
        {detailLoading ? <p className="loading" role="status">Eintrag wird geladen …</p> : creating || (editing && detail) ? <Editor legal={legal} key={creating ? 'new' : `${detail!.entry.id}-${detail!.entry.version}`} entry={creating ? null : detail!.entry} missions={missions} successors={successors} onSaved={saved} onClose={() => { setCreating(false); setEditing(false); }} /> : detail ? <>
          <header><div><p className="eyebrow">{contextKinds[detail.entry.kind]}</p><h2>{detail.entry.title}</h2></div>{detail.entry.status !== 'SUPERSEDED' && <button onClick={() => setEditing(true)}>Bearbeiten</button>}</header>
          {detail.entry.status === 'SUPERSEDED' && <div className="context-retire"><p>Dieser Stand gilt nicht mehr.</p>{detail.entry.superseded_by && <button onClick={() => void loadDetail(detail.entry.superseded_by!)}>Nachfolger lesen →</button>}</div>}
          <EntryBody entry={detail.entry} missions={missions} />
          <div className="context-detail-footer"><small>Fassung {detail.entry.version} · {stamp(detail.entry.updated_at)}</small><button onClick={() => void loadDetail(detail.entry.id)}>Aktuellen Stand laden</button><a href={`${legal ? "/legal" : "/context"}?entry=${detail.entry.id}`}>Direktlink</a></div>
          <section className="context-history"><h3>Änderungsverlauf <span>({detail.history_total})</span></h3>{detail.revisions.map(revision => <details key={revision.version}><summary><b>Fassung {revision.version}</b><span>{stamp(revision.created_at)} · {revision.author}</span><p>{revision.change_reason}</p></summary><div><h3>{revision.snapshot.title}</h3><EntryBody entry={revision.snapshot} missions={missions} />{revision.snapshot.superseded_by && <button onClick={() => void loadDetail(revision.snapshot.superseded_by!)}>Damals verknüpften Nachfolger lesen</button>}</div></details>)}{detail.next_history_offset !== null && <button onClick={() => void older()}>Ältere Fassungen laden</button>}</section>
        </> : legal ? <>
          <header><h2>Lizenzen und Nutzungsrechte im Blick</h2></header>
          <p className="context-intro">Hier stehen Software, Modelle, Bilder, Musik, Schriften, KI-Inhalte und rechtliche Klärungsfragen für Tradegazing Office und den Desk. Wähle einen Eintrag für Einsatz, Lizenzfassung, Belege, Credits und Änderungsverlauf.</p>
          <div className="context-open-counts"><button onClick={() => filter({ legal_status: 'RIGHTS-OPEN', status: 'CURRENT' })}>Offene Prüfungen</button><button onClick={() => filter({ status: 'OPEN', legal_status: '' })}>Klärungsfragen</button><button onClick={() => filter({ status: 'ALL', legal_status: '' })}>Auch Historie anzeigen</button></div>
          <p className="notice">Ein dokumentierter Eintrag ist keine pauschale Freigabe. „Für benannten Einsatz belegt“ gilt nur für den erfassten Umfang. Der Erstbestand wird laufend ergänzt.</p>
          <p className="context-intro">Original-Lizenztexte bleiben bei den betroffenen Dateien oder im Belegarchiv. Private Verträge und Rechnungen werden nur über eine Beleg-ID referenziert. Änderungen werden mit Quellen und Begründung gespeichert.</p>
        </> : <>
          <header><div><p className="eyebrow">Einstieg für neue Chats</p><h2>Was aktuell gilt</h2></div></header>
          <p className="context-intro">Die bestätigten Grundlagen des Projekts. Wähle einen Eintrag, um Herkunft und Begründung zu lesen.</p>
          <div className="context-overview">{overview?.core.entries.map(entry => <button key={entry.id} onClick={() => void loadDetail(entry.id)}><small>{contextTopics[entry.topic]}</small><b>{entry.title}</b><span>{entry.summary}</span></button>)}</div>
          {overview && !overview.core.total && <p className="context-empty">Noch keine bestätigten Grundlagen im Projektüberblick. Beim Bestätigen eines Eintrags kannst du ihn hier aufnehmen.</p>}
          {overview?.core.truncated && <button onClick={() => filter({ status: 'CONFIRMED' })}>Weitere bestätigte Grundlagen in der Sammlung lesen</button>}
          <div className="context-open-counts"><button onClick={() => filter({ status: 'PROPOSED' })}>{overview?.proposals.total ?? 0} Vorschläge</button><button onClick={() => filter({ status: 'OPEN' })}>{overview?.open_questions.total ?? 0} offene Fragen</button></div>
          <p className="context-intro">Vorschläge und offene Fragen werden getrennt von Entscheidungen geführt. Ausführliche Konzepte bleiben in ihren Projektdateien.</p>
        </>}
      </section>
    </div>
    <footer className="footer"><span>Tradegazing Office Desk <b>v0.1</b></span><span>Wissen · Herkunft · Entwicklung</span></footer>
  </DeskShell>;
}
