import { bugLevels,bugStatuses,bugDecisions,bugEvidenceStates,bugFields,occurrenceFields,bugKeys } from './bug-contract.mjs';

const text=(maxLength=3000)=>({type:'string',maxLength});
const enumField=values=>({type:'string',enum:values});
const bugProperties=Object.fromEntries(bugFields.map(key=>[key,text(key==='title'?160:3000)]));
Object.assign(bugProperties,{severity:enumField(bugLevels),probability:enumField(bugLevels),risk:enumField(bugLevels),status:enumField(bugStatuses),evidence_state:enumField(bugEvidenceStates),components:{type:'array',items:text(80),minItems:1,maxItems:15}});
const bugSchema={type:'object',properties:bugProperties,required:['title','expected','actual','impact','severity','probability','risk','risk_reason','evidence_state','components'],additionalProperties:false};
const occurrenceProperties=Object.fromEntries(occurrenceFields.map(key=>[key,text()]));
occurrenceProperties.decision=enumField(bugDecisions);
occurrenceProperties.evidence_state=enumField(bugEvidenceStates);
const occurrenceSchema={type:'object',properties:occurrenceProperties,required:['context','evidence_ref','evidence_state','decision','reason'],additionalProperties:false};
const request_key={type:'string',minLength:1,maxLength:180};
const id={type:'string',minLength:1,maxLength:160};
const expected_revision={type:'integer',minimum:1};
const filters={q:text(200),risk:enumField(bugLevels),status:enumField(bugStatuses),component:text(200),mission_id:text(200),decision:enumField(bugDecisions),limit:{type:'integer',minimum:1,maximum:200},offset:{type:'integer',minimum:0}};
function tool(name,description,properties,required,readOnlyHint) {
  return {name,title:name.replaceAll('_',' '),description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint,destructiveHint:false,idempotentHint:true,openWorldHint:false}};
}
export const bugTools=[
  tool('bug_list','Sucht Bugs nach Risiko, Status, Komponente, Mission und aktueller Laufwirkung. Vor Neuanlage suchen. Hoher Risikowert allein erlaubt keine Reparatur.',filters,[],true),
  tool('bug_get','Liest Bug, Vorkommen, aktuelle kontextgebundene Laufentscheidungen und Änderungshistorie.',{id},['id'],true),
  tool('bug_create','Erfasst Bug mit Risikobegründung und erstem belegtem Vorkommen. Alle nicht laufblockierenden Bugs erfassen und Suchlauf fortsetzen. Startet keine Reparatur.',{request_key,bug:bugSchema,occurrence:occurrenceSchema},['request_key','bug','occurrence'],false),
  tool('bug_update','Ändert Bewertung oder Status mit erwarteter Revision und stabilem Request-Key. Keine Reparatur-, Merge-, Deployment- oder Neustartfreigabe.',{request_key,id,expected_revision,patch:{...bugSchema,required:[],minProperties:1}},['request_key','id','expected_revision','patch'],false),
  tool('bug_add_occurrence','Ergänzt Fund oder Neubewertung. Pro Mission/Run/Stufe gilt die neueste Entscheidung; frühere Vorkommen bleiben erhalten. BLOCKIERT braucht konkreten Run, Stufe und Begründung.',{request_key,id,occurrence:occurrenceSchema},['request_key','id','occurrence'],false),
];
