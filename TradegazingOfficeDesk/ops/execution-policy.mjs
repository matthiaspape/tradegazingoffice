import { DeskError, object, choice, text, modelText, effortText } from './contract.mjs';

// Inherited planning defaults from the reference Desk; not an Tradegazing Office user model preference.
export const policyVersion = 'tradegazing-office-execution/1';
export const workKinds = {
  ROUTINE: { label: 'Klare Routineaufgabe', detail: 'Extraktion, Übertragung oder Zusammenfassung mit eindeutigem Ergebnis.', model: 'gpt-5.6-luna' },
  PLANNING: { label: 'Strukturierte Klärung', detail: 'Überschaubare Planung, erste Recherche oder begrenzte Umsetzung.', model: 'gpt-5.6-terra' },
  SYNTHESIS: { label: 'Offene Analyse oder Gestaltung', detail: 'Alternativen, Quellen oder Ideen mit eigenem Urteil zu einem Ergebnis verbinden.', model: 'gpt-5.6-sol' },
  FOUNDATION: { label: 'Tragende Grundlagenentscheidung', detail: 'Viele abhängige Systeme oder langfristige Folgen; Fehler würden erhebliche Nacharbeit verursachen.', model: 'gpt-6-astra' },
};
export const complexityText = {
  STANDARD: 'Normaler Klärungsbedarf',
  DEMANDING: 'Besonders schwierige Abwägungen oder ungelöste Widersprüche',
};
export const assessmentSchema = {
  type: 'object',
  properties: {
    work_kind: { type: 'string', enum: Object.keys(workKinds), description: 'ROUTINE: klares wiederholbares Ergebnis; PLANNING: überschaubare Klärung; SYNTHESIS: offene Analyse/Gestaltung; FOUNDATION: folgenreiche Grundlagen mit vielen Abhängigkeiten. Nach Aufgabeninhalt entscheiden, nicht nur nach Missionstyp oder dem Wort Research.' },
    complexity: { type: 'string', enum: Object.keys(complexityText), description: 'STANDARD als Ausgangspunkt. DEMANDING bei besonders schwierigen Abwägungen, widersprüchlichen Quellen oder ungelösten Zusammenhängen; Research allein genügt nicht.' },
  },
  required: ['work_kind', 'complexity'], additionalProperties: false,
};

export function recommendExecution(assessment) {
  if (assessment === undefined) throw new DeskError('Bitte die Art der Arbeit und den Klärungsbedarf im Entscheidungsbaum angeben (execution_assessment).');
  object(assessment);
  for (const key of Object.keys(assessment)) if (!['work_kind', 'complexity'].includes(key)) throw new DeskError(`Unbekanntes Bewertungsfeld: ${key}`);
  const kind = choice(assessment.work_kind, workKinds, 'Art der Arbeit');
  const complexity = choice(assessment.complexity, complexityText, 'Klärungsbedarf');
  const recommended_model = workKinds[kind].model;
  const recommended_effort = kind === 'ROUTINE' ? (complexity === 'DEMANDING' ? 'medium' : 'low') : (complexity === 'DEMANDING' ? 'high' : 'medium');
  return {
    recommended_model, recommended_effort, policy_version: policyVersion,
    execution_assessment: { work_kind: kind, complexity },
    reason: `${workKinds[kind].label}: ${workKinds[kind].detail} ${complexityText[complexity]}. Deshalb ${modelText[recommended_model]} · ${effortText[recommended_effort]}.`,
  };
}

export function resolveExecution(assessment, fields, reasonInput) {
  const recommendation = recommendExecution(assessment);
  const hasModel = fields.recommended_model !== undefined, hasEffort = fields.recommended_effort !== undefined;
  if (hasModel !== hasEffort) throw new DeskError('Bei manueller Wahl bitte Modell und Denkstufe zusammen angeben.');
  const model = hasModel ? choice(fields.recommended_model, modelText, 'Modell') : recommendation.recommended_model;
  const effort = hasEffort ? choice(fields.recommended_effort, effortText, 'Denkstufe') : recommendation.recommended_effort;
  const override = model !== recommendation.recommended_model || effort !== recommendation.recommended_effort;
  const reason = reasonInput === undefined ? '' : text(reasonInput, 'Modellbegründung', 1000);
  if (override && !reason) throw new DeskError('Bitte die Abweichung vom empfohlenen Profil begründen (recommendation_reason).');
  const audit = `Entscheidungsbaum ${policyVersion}: ${recommendation.execution_assessment.work_kind} / ${recommendation.execution_assessment.complexity}.\n${recommendation.reason}`
    + (override ? `\nBewusste Abweichung: ${modelText[model]} · ${effortText[effort]}.` : '')
    + (reason ? `\nBegründung: ${reason}` : '');
  return { recommended_model: model, recommended_effort: effort, audit };
}
