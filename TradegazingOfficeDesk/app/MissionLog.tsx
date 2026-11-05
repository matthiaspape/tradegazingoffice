"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors avoid a vinext client hydration conflict */

import { FormEvent, useEffect, useMemo, useState } from "react";
import DeskShell from './DeskShell';
import { evidenceUrl } from "./evidence-links";
import { browserModelContext, registerMissionTools } from "./webmcp";
import ExecutionPlanner, { emptyExecution, executionPayload } from "./ExecutionPlanner";

type MissionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DISCARDED";
type MissionModel = "gpt-6-astra" | "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
type MissionEffort = "low" | "medium" | "high";
type MissionType = "PRODUCT_DESIGN" | "DESIGN" | "PROTOTYPE" | "DEVELOPMENT" | "INTEGRATION" | "TESTING" | "PLATFORM" | "RELEASE";
type Mission = {
  version: number; id: string; title: string; objective: string; status: MissionStatus; mission_number: number;
  mission_type: MissionType; tags: string[];
  recommended_model: MissionModel; recommended_effort: MissionEffort;
  briefing: string; result_summary: string | null; link_label: string | null; link_url: string | null;
  created_at: string; updated_at: string; completed_at: string | null;
};
type MissionLogEntry = { id: number; mission_id: string; body: string; link_label: string | null; link_url: string | null; author: string; created_at: string };

const statusText: Record<MissionStatus, string> = { PLANNED: "Geplant", IN_PROGRESS: "In Arbeit", COMPLETED: "Erledigt", DISCARDED: "Verworfen" };
const statusOrder: MissionStatus[] = ["IN_PROGRESS", "PLANNED", "COMPLETED", "DISCARDED"];
const modelText: Record<MissionModel, string> = { "gpt-6-astra": "Astra", "gpt-5.6-luna": "Luna", "gpt-5.6-terra": "Terra", "gpt-5.6-sol": "Sol" };
const effortText: Record<MissionEffort, string> = { low: "Light", medium: "Medium", high: "High" };
const missionTypeText: Record<MissionType, string> = { PRODUCT_DESIGN: "Produktkonzept", DESIGN: "Design & Identität", PROTOTYPE: "Prototyp", DEVELOPMENT: "Entwicklung", INTEGRATION: "Integrationen", TESTING: "Tests & Qualität", PLATFORM: "Projektorganisation", RELEASE: "Veröffentlichung" };
const missionTypeOrder = Object.keys(missionTypeText) as MissionType[];

function MissionLogTimestamp({ value }: { value: string }) {
  const timestamp = new Date(value);
  return <time dateTime={value} className="mission-log-timestamp">
    <span>{timestamp.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Berlin" })}</span>
    <small>{timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })} Uhr</small>
  </time>;
}

function MissionCard({ mission, entries, targeted, onSaved, onLogAdded }: { mission: Mission; entries: MissionLogEntry[]; targeted: boolean; onSaved: (mission: Mission) => void; onLogAdded: (entry: MissionLogEntry) => void }) {
  const [open, setOpen] = useState(targeted);
  useEffect(() => { if (targeted) setOpen(true); }, [targeted]);
  const [editVersion, setEditVersion] = useState(mission.version);
  const [editTitle, setEditTitle] = useState(mission.title);
  const [editObjective, setEditObjective] = useState(mission.objective);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<MissionStatus>(mission.status);
  const [recommendedModel, setRecommendedModel] = useState<MissionModel>(mission.recommended_model);
  const [recommendedEffort, setRecommendedEffort] = useState<MissionEffort>(mission.recommended_effort);
  const [profileReason, setProfileReason] = useState("");
  const profileChanged = recommendedModel !== mission.recommended_model || recommendedEffort !== mission.recommended_effort;
  const [missionType, setMissionType] = useState<MissionType>(mission.mission_type);
  const [tags, setTags] = useState(mission.tags.join(", "));
  const [briefing, setBriefing] = useState(mission.briefing);
  const [result, setResult] = useState(mission.result_summary ?? "");
  const [linkLabel, setLinkLabel] = useState(mission.link_label ?? "");
  const [linkUrl, setLinkUrl] = useState(mission.link_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logBody, setLogBody] = useState("");
  const [logLink, setLogLink] = useState("");
  const [logLinkLabel, setLogLinkLabel] = useState("");
  const [logging, setLogging] = useState(false);

  async function save() {
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = await requestJson("/api/missions", "PATCH", { id: mission.id, expectedVersion: editVersion, title: editTitle, objective: editObjective, status, missionType, tags: tags.split(","), recommendedModel, recommendedEffort, ...(profileChanged ? { recommendationReason: profileReason } : {}), briefing, resultSummary: result, linkLabel, linkUrl });
      setEditVersion(payload.version); setProfileReason(""); await onSaved(payload); setNotice("Mission gespeichert.");
    } catch (error) { setError(errorMessage(error)); } finally { setSaving(false); }
  }
  async function addLog(event: FormEvent) {
    event.preventDefault(); if (!logBody.trim()) return; setLogging(true); setError("");
    try {
      const payload = await requestJson("/api/missions/logs", "POST", { missionId: mission.id, body: logBody, linkLabel: logLinkLabel, linkUrl: logLink });
      await onLogAdded(payload); setLogBody(""); setLogLink(""); setLogLinkLabel("");
    } catch (error) { setError(errorMessage(error)); } finally { setLogging(false); }
  }

  return <article id={`mission-${mission.mission_number}`} tabIndex={targeted ? -1 : undefined} className={`mission-record ${mission.status.toLowerCase()}${targeted ? " mission-targeted" : ""}`}>
    <button className="mission-summary" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="mission-priority">MISSION {String(mission.mission_number).padStart(2, "0")}</span>
      <span className="mission-main"><b>{mission.title}</b><small>{mission.objective}</small><span className="mission-taxonomy"><i>{missionTypeText[mission.mission_type]}</i>{mission.tags.slice(0, 3).map((tag) => <em key={tag}>{tag.replaceAll("_", " ")}</em>)}</span></span>
      <span className={`mission-execution ${mission.recommended_model.split("-").at(-1)}`} title="Empfohlenes Codex-Ausführungsprofil">{modelText[mission.recommended_model]} · {effortText[mission.recommended_effort]}</span>
      <span className={`mission-status ${mission.status.toLowerCase()}`}>{statusText[mission.status]}</span>
      <span className="mission-toggle">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="mission-editor">
      <div className="mission-field"><label htmlFor={`${mission.id}-title`}>Titel</label><input id={`${mission.id}-title`} value={editTitle} maxLength={120} required onChange={e => setEditTitle(e.target.value)} /></div>
      <div className="mission-field"><label htmlFor={`${mission.id}-objective`}>Ziel</label><input id={`${mission.id}-objective`} value={editObjective} maxLength={300} required onChange={e => setEditObjective(e.target.value)} /></div>
      <div className="mission-field status-field"><label htmlFor={`${mission.id}-status`}>Status</label><select id={`${mission.id}-status`} value={status} onChange={(event) => setStatus(event.target.value as MissionStatus)}>{statusOrder.map((item) => <option key={item} value={item}>{statusText[item]}</option>)}</select></div>
      <div className="mission-taxonomy-editor"><div className="mission-field"><label htmlFor={`${mission.id}-type`}>Missionstyp</label><select id={`${mission.id}-type`} value={missionType} onChange={(event) => setMissionType(event.target.value as MissionType)}>{missionTypeOrder.map((item) => <option key={item} value={item}>{missionTypeText[item]}</option>)}</select></div><div className="mission-field"><label htmlFor={`${mission.id}-tags`}>Tags · mit Komma trennen</label><input id={`${mission.id}-tags`} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="DESK, FLEET_CONTROL, ACCOUNTING" /></div></div>
      <div className="mission-execution-editor"><div className="mission-field"><label htmlFor={`${mission.id}-model`}>Empfohlenes Modell</label><select id={`${mission.id}-model`} value={recommendedModel} onChange={(event) => setRecommendedModel(event.target.value as MissionModel)}><option value="gpt-6-astra">Astra</option><option value="gpt-5.6-luna">Luna</option><option value="gpt-5.6-terra">Terra</option><option value="gpt-5.6-sol">Sol</option></select></div><div className="mission-field"><label htmlFor={`${mission.id}-effort`}>Effort</label><select id={`${mission.id}-effort`} value={recommendedEffort} onChange={(event) => setRecommendedEffort(event.target.value as MissionEffort)}><option value="low">Light</option><option value="medium">Medium</option><option value="high">High</option></select></div></div>
      {profileChanged && <div className="mission-field full"><label htmlFor={`${mission.id}-profile-reason`}>Warum wird das Ausführungsprofil geändert?</label><textarea id={`${mission.id}-profile-reason`} value={profileReason} onChange={e => setProfileReason(e.target.value)} maxLength={1000} placeholder="Begründung für das Logbuch …" required /></div>}
      <div className="mission-field full"><label htmlFor={`${mission.id}-briefing`}>Briefing / Plan</label><textarea id={`${mission.id}-briefing`} value={briefing} onChange={(event) => setBriefing(event.target.value)} maxLength={4000} /></div>
      <div className="mission-field full"><label htmlFor={`${mission.id}-result`}>Ergebnis / Entscheidung</label><textarea id={`${mission.id}-result`} value={result} onChange={(event) => setResult(event.target.value)} maxLength={4000} placeholder="Erkenntnisse, Ergebnisse und Begründung festhalten …" /></div>
      <div className="mission-field"><label htmlFor={`${mission.id}-link-label`}>Link-Bezeichnung</label><input id={`${mission.id}-link-label`} value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="z. B. Projektunterlagen" /></div>
      <div className="mission-field"><label htmlFor={`${mission.id}-link-url`}>Ergebnis oder Quelle verlinken</label><input id={`${mission.id}-link-url`} value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://…" /></div>
      <div className="mission-actions"><small>Zuletzt aktualisiert: {new Date(mission.updated_at).toLocaleDateString("de-DE")}</small>{mission.link_url && <a href={evidenceUrl(mission.link_url)} target="_blank" rel="noreferrer">{mission.link_label || "Projektunterlagen"} ↗</a>}<button type="button" onClick={save} disabled={saving || (profileChanged && !profileReason.trim())}>{saving ? "Speichert …" : "Mission speichern"}</button></div>
      <a className="full" href={`/context?mission=${mission.id}`}>Wissen zu dieser Mission im Context Core →</a>
      <a className="full" href={`/bugs?mission_id=${encodeURIComponent(mission.id)}`}>Bugs und Laufwirkung dieser Mission →</a>
      <section className="mission-logbook">
        <header><div><p className="eyebrow">Missionslogbuch</p><h3>Zwischenergebnisse</h3></div><span>{entries.length} Einträge</span></header>
        <div className="mission-log-list">{entries.length ? entries.map((entry) => <article key={entry.id}><MissionLogTimestamp value={entry.created_at} /><p>{entry.body}</p><footer><span>{entry.author}</span>{entry.link_url && <a href={evidenceUrl(entry.link_url)} target="_blank" rel="noreferrer">{entry.link_label || "Quelle"} ↗</a>}</footer></article>) : <p className="mission-log-empty">Noch keine Zwischenstände dokumentiert.</p>}</div>
        <form className="mission-log-form" onSubmit={addLog}><label htmlFor={`${mission.id}-log`}>Neuer Logbucheintrag</label><textarea id={`${mission.id}-log`} value={logBody} onChange={(event) => setLogBody(event.target.value)} maxLength={3000} placeholder="Zwischenstand, Idee, Beobachtung oder Entscheidung …" required /><div><input aria-label="Link-Bezeichnung" value={logLinkLabel} onChange={(event) => setLogLinkLabel(event.target.value)} placeholder="Link-Bezeichnung" /><input aria-label="Quellen-Link" value={logLink} onChange={(event) => setLogLink(event.target.value)} placeholder="https://…" /><button disabled={logging || !logBody.trim()}>{logging ? "Loggt …" : "Eintrag loggen"}</button></div></form>
      </section>
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    </div>}
  </article>;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Verbindung fehlgeschlagen. Bitte erneut versuchen."; }
async function requestJson(url: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json", ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Die Anfrage konnte nicht gespeichert werden.");
  return payload;
}

export default function MissionLog() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [logs, setLogs] = useState<MissionLogEntry[]>([]);
  const [filter, setFilter] = useState<"ALL" | MissionStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | MissionType>("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [deepLinkMission, setDeepLinkMission] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [execution, setExecution] = useState(emptyExecution);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState(""); const [objective, setObjective] = useState(""); const [briefing, setBriefing] = useState(""); const [newMissionType, setNewMissionType] = useState<MissionType>("PRODUCT_DESIGN"); const [newTags, setNewTags] = useState("");

  async function refresh() {
    const payload = await requestJson("/api/missions");
    setMissions(payload.missions); setLogs(payload.logs);
  }
  useEffect(() => {
    let active = true;
    const requested = Number(new URLSearchParams(window.location.search).get("mission"));
    if (Number.isInteger(requested) && requested > 0) setDeepLinkMission(requested);
    requestJson("/api/local/session", "POST", {}, { "x-desk-session": "1" })
      .then(async () => { if (active) await refresh(); }).catch(error => active && setError(errorMessage(error)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (loading || error) return;
    return registerMissionTools(browserModelContext(), async (name, input) => {
      const reply = await requestJson("/api/mcp", "POST", { jsonrpc: "2.0", id: crypto.randomUUID(), method: "tools/call", params: { name, arguments: input } });
      if (reply.error || reply.result?.isError) throw new Error(reply.error?.message || reply.result?.content?.[0]?.text || "Werkzeug fehlgeschlagen.");
      return reply.result.structuredContent;
    }, refresh);
  }, [loading, error]);
  const availableTags = useMemo(() => [...new Set(missions.flatMap((mission) => mission.tags))].sort(), [missions]);
  const visible = useMemo(() => missions.filter((mission) => (!search || [mission.title, mission.objective, mission.briefing, String(mission.mission_number), ...mission.tags].join(" ").toLocaleLowerCase("de-DE").includes(search.toLocaleLowerCase("de-DE"))) && (filter === "ALL" || mission.status === filter) && (typeFilter === "ALL" || mission.mission_type === typeFilter) && (tagFilter === "ALL" || mission.tags.includes(tagFilter))), [filter, missions, tagFilter, typeFilter, search]);
  const count = (status: MissionStatus) => missions.filter((mission) => mission.status === status).length;

  useEffect(() => {
    if (loading || !deepLinkMission) return;
    const target = document.getElementById(`mission-${deepLinkMission}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  }, [deepLinkMission, loading, visible.length]);

  async function create(event: FormEvent) {
    event.preventDefault(); setCreating(true); setError("");
    try {
      const created = await requestJson("/api/missions", "POST", { title, objective, briefing, missionType: newMissionType, tags: newTags.split(","), ...executionPayload(execution) });
      setMissions(current => [...current, created]);
      setTitle(""); setObjective(""); setBriefing(""); setNewTags(""); setNewOpen(false); setExecution(emptyExecution);
      setFilter("ALL"); setTypeFilter("ALL"); setTagFilter("ALL"); setSearch("");
      try { await refresh(); } catch { setError("Mission angelegt. Bitte die Ansicht neu laden, um das Logbuch zu aktualisieren."); }
    } catch (error) { setError(errorMessage(error)); } finally { setCreating(false); }
  }

  return <DeskShell current="missions">
    <section className="mission-hero"><div><p className="kicker">TRADEGAZING OFFICE · PROJEKTORGANISATION</p><h1>Mission Log<span>.</span></h1><p>Ideen entwickeln. Projekte planen. Fortschritt festhalten.</p></div><button disabled={loading} aria-expanded={newOpen} onClick={() => setNewOpen(!newOpen)}>{newOpen ? "Schließen" : "+ Neue Mission"}</button></section>
    {error && <div className="error" role="alert">{error} <button onClick={() => window.location.reload()}>Neu laden</button></div>}
    <section className="mission-overview">
      <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}><span>Alle Missionen</span><b>{missions.length}</b></button>
      {statusOrder.map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}><span>{statusText[status]}</span><b>{count(status)}</b></button>)}
    </section>
    <section className="mission-taxonomy-filters"><label className="mission-search">Mission suchen<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Titel, Ziel oder Tag …" type="search" /></label><label>Missionstyp<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "ALL" | MissionType)}><option value="ALL">Alle Typen</option>{missionTypeOrder.map((item) => <option key={item} value={item}>{missionTypeText[item]}</option>)}</select></label><label>Tag<select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}><option value="ALL">Alle Tags</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag.replaceAll("_", " ")}</option>)}</select></label></section>
    {newOpen && <form className="new-mission" onSubmit={create}><div><p className="eyebrow">Neue Mission</p><h3>Nächstes Ziel</h3></div><div className="mission-field"><label htmlFor="new-mission-title">Titel</label><input id="new-mission-title" maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="mission-field"><label htmlFor="new-mission-objective">Ziel</label><input id="new-mission-objective" maxLength={300} required value={objective} onChange={(event) => setObjective(event.target.value)} /></div><div className="mission-field"><label htmlFor="new-mission-type">Missionstyp</label><select id="new-mission-type" value={newMissionType} onChange={(event) => setNewMissionType(event.target.value as MissionType)}>{missionTypeOrder.map((item) => <option key={item} value={item}>{missionTypeText[item]}</option>)}</select></div><div className="mission-field"><label htmlFor="new-mission-tags">Tags</label><input id="new-mission-tags" value={newTags} onChange={(event) => setNewTags(event.target.value)} placeholder="DESK, FLEET_CONTROL" /></div><div className="mission-field full"><label htmlFor="new-mission-briefing">Erstes Briefing</label><textarea id="new-mission-briefing" maxLength={4000} value={briefing} onChange={(event) => setBriefing(event.target.value)} /></div><ExecutionPlanner value={execution} onChange={setExecution} /><button disabled={creating}>{creating ? "Wird angelegt …" : "Mission anlegen"}</button></form>}
    <section className="mission-board"><header><div><p className="eyebrow">PROJEKTLOGBUCH</p><h3>Unsere Missionen</h3></div><span>{visible.length} Einträge</span></header>{loading ? <p className="loading">Missionslog wird geladen …</p> : !visible.length ? <div className="mission-empty"><span aria-hidden="true">↗</span><h3>{missions.length ? "Keine passenden Missionen" : "Hier beginnt unser Weg."}</h3><p>{missions.length ? "Passe die Suche oder die Filter an." : "Lege die erste Mission an – eine Idee, eine offene Frage oder den nächsten Entwicklungsschritt."}</p>{!missions.length && <button onClick={() => setNewOpen(true)}>+ Erste Mission anlegen</button>}</div> : visible.map((mission) => <MissionCard key={mission.id} mission={mission} targeted={mission.mission_number === deepLinkMission} entries={logs.filter((entry) => entry.mission_id === mission.id)} onSaved={async (saved) => { setMissions(current => current.map(item => item.id === saved.id ? saved : item)); await refresh(); }} onLogAdded={async () => { await refresh(); }} />)}</section>
    <footer className="footer"><span>Tradegazing Office Desk <b>v0.1</b></span><span>Idee → Mission → Ergebnis → Entscheidung</span></footer>
  </DeskShell>;
}
