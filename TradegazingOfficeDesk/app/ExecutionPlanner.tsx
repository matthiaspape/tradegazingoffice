"use client";
import { workKinds, complexityText, recommendExecution } from '../ops/execution-policy.mjs';
import { modelText, effortText } from '../ops/contract.mjs';

export type ExecutionDraft = { workKind: string; complexity: string; manual: boolean; model: string; effort: string; reason: string };
export const emptyExecution: ExecutionDraft = { workKind: '', complexity: '', manual: false, model: '', effort: '', reason: '' };

export function executionPayload(draft: ExecutionDraft) {
  return {
    execution_assessment: { work_kind: draft.workKind, complexity: draft.complexity },
    ...(draft.manual ? { recommended_model: draft.model, recommended_effort: draft.effort } : {}),
    ...(draft.reason.trim() ? { recommendation_reason: draft.reason } : {}),
  };
}

export default function ExecutionPlanner({ value, onChange }: { value: ExecutionDraft; onChange: (value: ExecutionDraft) => void }) {
  const change = (patch: Partial<ExecutionDraft>) => onChange({ ...value, ...patch });
  const recommendation = value.workKind && value.complexity ? recommendExecution({ work_kind: value.workKind, complexity: value.complexity }) : null;
  return <fieldset className="execution-planner full">
    <legend>Passendes Modell wählen</legend>
    <p>Ordne die Arbeit ein. Daraus ergibt sich eine Empfehlung für diese Mission.</p>
    <div className="execution-questions">
      <label htmlFor="execution-kind">1. Welche Art von Arbeit ist es?
        <select id="execution-kind" required value={value.workKind} onChange={e => change({ workKind: e.target.value })}>
          <option value="">Bitte einordnen …</option>
          {Object.entries(workKinds).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
        </select>
      </label>
      <label htmlFor="execution-complexity">2. Wie anspruchsvoll ist die Klärung?
        <select id="execution-complexity" required value={value.complexity} onChange={e => change({ complexity: e.target.value })}>
          <option value="">Bitte einschätzen …</option>
          {Object.entries(complexityText).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
    </div>
    <details className="execution-decision-tree">
      <summary>Entscheidungsbaum anzeigen</summary>
      <ol>
        <li className={value.workKind === 'FOUNDATION' ? 'chosen' : ''}><span>Folgenreiche Grundlage mit vielen Abhängigkeiten?</span><b>Ja → Astra</b><small>Nein ↓</small></li>
        <li className={value.workKind === 'SYNTHESIS' ? 'chosen' : ''}><span>Offene Analyse, Gestaltung oder anspruchsvolle Synthese?</span><b>Ja → Sol</b><small>Nein ↓</small></li>
        <li className={value.workKind === 'ROUTINE' ? 'chosen' : ''}><span>Klar umrissene, wiederholbare Aufgabe?</span><b>Ja → Luna</b><small>Nein ↓</small></li>
        <li className={value.workKind === 'PLANNING' ? 'chosen' : ''}><span>Überschaubare Planung, Recherche oder Umsetzung</span><b>→ Terra</b></li>
      </ol>
      <p>Denkstufe getrennt wählen: normalerweise Medium, bei klarer Routine Light. Besonders schwierige Abwägungen erhöhen auf High, bei Routine auf Medium. „Research“ allein ist kein Grund für eine höhere Stufe.</p>
    </details>
    <div className="execution-recommendation" aria-live="polite">
      {recommendation ? <><b>{modelText[recommendation.recommended_model as keyof typeof modelText]} · {effortText[recommendation.recommended_effort as keyof typeof effortText]}</b><p>{recommendation.reason}</p></> : <p>Nach den beiden Antworten erscheint das empfohlene Profil.</p>}
    </div>
    <label className="execution-override"><input type="checkbox" checked={value.manual} onChange={e => change({ manual: e.target.checked, model: recommendation?.recommended_model || '', effort: recommendation?.recommended_effort || '' })} /> Profil bewusst selbst festlegen</label>
    {value.manual && <div className="execution-questions">
      <label htmlFor="execution-model">Modell<select id="execution-model" required value={value.model} onChange={e => change({ model: e.target.value })}><option value="">Bitte wählen …</option>{Object.entries(modelText).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label htmlFor="execution-effort">Denkstufe<select id="execution-effort" required value={value.effort} onChange={e => change({ effort: e.target.value })}><option value="">Bitte wählen …</option>{Object.entries(effortText).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div>}
    <label className="execution-reason" htmlFor="execution-reason">{value.manual ? 'Begründung der eigenen Wahl' : 'Zusätzliche Begründung (optional)'}<textarea id="execution-reason" required={value.manual} maxLength={1000} value={value.reason} onChange={e => change({ reason: e.target.value })} placeholder="Was macht dieses Profil für die Mission passend?" /></label>
    <small>Empfehlung und Begründung werden im Logbuch gespeichert. Es wird keine Aufgabe gestartet und kein laufendes Modell umgestellt.</small>
  </fieldset>;
}
