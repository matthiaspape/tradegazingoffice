import { createHash, randomUUID } from 'node:crypto';
import { withBugDatabase } from './bug-db.mjs';
import { bugSchemaColumns } from './bug-schema.mjs';
import { BugError, bugText, bugObject, bugKeys, bugFields, validateBug, validateOccurrence, closedBugStatuses, bugLevels, bugStatuses, bugDecisions } from './bug-contract.mjs';

function ready(db) {
  try {
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('bug_board_schema','desk_bugs','bug_occurrences','bug_events')").all();
    if(tables.results.length!==4||(db.prepare('SELECT version FROM bug_board_schema').first())?.version!==1) throw new BugError('Bug Board noch nicht eingerichtet. Explizite Offline-Schemaeinrichtung erforderlich.',503);
    for(const [table,columns] of Object.entries(bugSchemaColumns))db.prepare(`SELECT ${columns.join(',')} FROM ${table} LIMIT 0`).all();
  } catch(error) {
    if(error instanceof BugError)throw error;
    throw new BugError('Bug-Board-Schema unvollständig. Explizite Offline-Schemaeinrichtung erforderlich.',503);
  }
  return db;
}
function presentBug(row) {
  return {...JSON.parse(row.document_json),id:row.id,number:row.number,label:`OFFICE-BUG-${String(row.number).padStart(4,'0')}`,revision:row.revision,created_at:row.created_at,updated_at:row.updated_at};
}
function presentOccurrence(row) { return {...JSON.parse(row.document_json),id:row.id,bug_id:row.bug_id,actor:row.actor,created_at:row.created_at}; }
function rowById(db,id) {
  const row=db.prepare('SELECT * FROM desk_bugs WHERE id=?').bind(bugText(id,'Bug-ID',160)).first();
  if(!row) throw new BugError('Bug nicht gefunden.',404);
  return row;
}
function latestOccurrences(rows) {
  const latest=new Map();
  for(const row of rows) latest.set(JSON.stringify([row.mission_id,row.run_id,row.stage]),row);
  return [...latest.values()];
}
export function getBug(id) {
  return withBugDatabase(db=>{ ready(db); const bug=presentBug(rowById(db,id));
  const occurrences=(db.prepare("SELECT * FROM bug_occurrences WHERE bug_id=? OR bug_id IN (SELECT id FROM desk_bugs WHERE status='DUPLIKAT' AND json_extract(document_json,'$.duplicate_of')=?) ORDER BY id").bind(id,id).all()).results.map(presentOccurrence);
  const events=(db.prepare('SELECT id,action,actor,response_json,created_at FROM bug_events WHERE bug_id=? ORDER BY id DESC').bind(id).all()).results.map(({response_json,...e})=>({...e,snapshot:JSON.parse(response_json)}));
  return {...bug,occurrences,current_occurrences:latestOccurrences(occurrences),events};
  });
}
export function listBugs(filters={}) {
  bugKeys(filters,['q','risk','status','component','mission_id','decision','limit','offset']);
  const q=bugText(filters.q,'Suche',200,false).toLocaleLowerCase('de');
  for(const [key,values] of [['risk',bugLevels],['status',bugStatuses],['decision',bugDecisions]]) if(filters[key]!==undefined&&filters[key]!==''&&!values.includes(filters[key])) throw new BugError(`Ungültiger Filter: ${key}`);
  for(const key of ['component','mission_id']) if(filters[key]!==undefined) bugText(filters[key],key,200,false);
  const limit=filters.limit??100,offset=filters.offset??0;
  if(!Number.isSafeInteger(limit)||limit<1||limit>200||!Number.isSafeInteger(offset)||offset<0) throw new BugError('Ungültige Seitengröße oder Position.');
  return withBugDatabase(db=>{ ready(db);
  const rows=(db.prepare('SELECT * FROM desk_bugs ORDER BY number DESC').all()).results;
  const occurrences=(db.prepare('SELECT * FROM bug_occurrences ORDER BY id').all()).results.map(presentOccurrence);
  const grouped=new Map(),byId=new Map(rows.map(row=>[row.id,presentBug(row)]));
  for(const item of occurrences) {
    const source=byId.get(item.bug_id),target=source?.status==='DUPLIKAT'?source.duplicate_of:item.bug_id;
    if(!grouped.has(target)) grouped.set(target,[]); grouped.get(target).push(item);
  }
  const bugs=rows.map(row=>{
    const bug=presentBug(row),all=grouped.get(bug.id)||[],current=latestOccurrences(all);
    const relevant=filters.mission_id?current.filter(o=>o.mission_id===filters.mission_id):current;
    return {...bug,occurrence_count:all.length,current_occurrences:relevant,blocked:!closedBugStatuses.includes(bug.status)&&relevant.some(o=>o.decision==='BLOCKIERT')};
  }).filter(bug=>(!q||[bug.label,bug.title,bug.actual,bug.impact,bug.scope,...bug.components].join(' ').toLocaleLowerCase('de').includes(q))&&(!filters.risk||bug.risk===filters.risk)&&(!filters.status||bug.status===filters.status)&&(!filters.component||bug.components.includes(filters.component))&&(!filters.mission_id||bug.current_occurrences.some(o=>o.mission_id===filters.mission_id))&&(!filters.decision||bug.current_occurrences.some(o=>o.decision===filters.decision&&(!filters.mission_id||o.mission_id===filters.mission_id))));
  const open=bugs.filter(b=>!closedBugStatuses.includes(b.status));
  return {bugs:bugs.slice(offset,offset+limit),total:bugs.length,offset,has_more:offset+limit<bugs.length,summary:{open:open.length,blockers:open.filter(b=>b.blocked).length,high:open.filter(b=>b.risk==='HOCH').length,deferred:open.filter(b=>b.status==='ZURUECKGESTELLT').length}};
  });
}
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function writeOperation(action,args,actor,operation) {
  bugObject(args);
  const key=bugText(args.request_key,'Stabiler Request-Key',180);
  const hash=createHash('sha256').update(JSON.stringify(canonical({action,args}))).digest('hex');
  return withBugDatabase(db=>{ ready(db);
  const prior=db.prepare('SELECT request_sha256,response_json FROM bug_events WHERE request_key=?').bind(key).first();
  if(prior) {
    if(prior.request_sha256!==hash) throw new BugError('Request-Key bereits mit anderem Inhalt verwendet.',409);
    return JSON.parse(prior.response_json);
  }
  const now=new Date().toISOString();
  const result=operation(db,now);
  db.prepare('INSERT INTO bug_events(bug_id,request_key,request_sha256,action,actor,response_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(result.id,key,hash,action,actor,JSON.stringify(result),now).run();
  return result;
  },true);
}
function checkDuplicate(db,bug,id) {
  if(bug.status!=='DUPLIKAT')return;
  if(bug.duplicate_of===id)throw new BugError('Ein Bug kann nicht sein eigenes Duplikat sein.');
  const target=presentBug(rowById(db,bug.duplicate_of));
  if(target.status==='DUPLIKAT')throw new BugError('Bitte auf den ursprünglichen Bug verweisen, nicht auf ein weiteres Duplikat.');
  if(db.prepare("SELECT id FROM desk_bugs WHERE status='DUPLIKAT' AND json_extract(document_json,'$.duplicate_of')=?").bind(id).first())throw new BugError('Ein Bug mit verknüpften Duplikaten kann nicht selbst zum Duplikat werden.');
}
function appendOccurrence(db,id,value,actor,now) {
  const occurrence=validateOccurrence(value);
  if(occurrence.mission_id&&!(db.prepare('SELECT id FROM missions WHERE id=?').bind(occurrence.mission_id).first())) throw new BugError('Verknüpfte Mission nicht gefunden.',404);
  db.prepare('INSERT INTO bug_occurrences(bug_id,mission_id,run_id,stage,decision,document_json,actor,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,occurrence.mission_id||null,occurrence.run_id,occurrence.stage,occurrence.decision,JSON.stringify(occurrence),actor,now).run();
}
export function createBug(args,actor) {
  bugKeys(args,['request_key','bug','occurrence']);
  return writeOperation('bug_create',args,actor,(db,now)=>{
    const bug=validateBug(args.bug),id=randomUUID();
    checkDuplicate(db,bug,id);
    db.prepare('INSERT INTO desk_bugs(id,title,status,risk,revision,document_json,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?)').bind(id,bug.title,bug.status,bug.risk,JSON.stringify(bug),now,now).run();
    appendOccurrence(db,id,args.occurrence,actor,now);
    return presentBug(rowById(db,id));
  });
}
function revision(args,row) {
  if(!Number.isSafeInteger(args.expected_revision)||args.expected_revision!==row.revision) throw new BugError('Der Bug wurde inzwischen geändert. Neu laden und mit aktueller Revision erneut senden.',409);
}
export function updateBug(args,actor) {
  bugKeys(args,['request_key','id','expected_revision','patch']);
  return writeOperation('bug_update',args,actor,(db,now)=>{
    const row=rowById(db,args.id); revision(args,row);
    bugKeys(args.patch,bugFields);
    if(!Object.keys(args.patch).length)throw new BugError('Mindestens ein Änderungsfeld erforderlich.');
    const bug=validateBug({...JSON.parse(row.document_json),...args.patch});
    checkDuplicate(db,bug,row.id);
    db.prepare('UPDATE desk_bugs SET title=?,status=?,risk=?,document_json=?,revision=revision+1,updated_at=? WHERE id=?').bind(bug.title,bug.status,bug.risk,JSON.stringify(bug),now,row.id).run();
    return presentBug(rowById(db,row.id));
  });
}
export function addBugOccurrence(args,actor) {
  bugKeys(args,['request_key','id','occurrence']);
  return writeOperation('bug_add_occurrence',args,actor,(db,now)=>{
    const row=rowById(db,args.id),bug=JSON.parse(row.document_json);
    if(bug.status==='DUPLIKAT')throw new BugError(`Vorkommen bitte beim ursprünglichen Bug ${bug.duplicate_of} erfassen.`,409);
    appendOccurrence(db,row.id,args.occurrence,actor,now);
    if(['ERLEDIGT','KEIN_FEHLER'].includes(bug.status)&&args.occurrence.decision!=='KONTEXT_BEENDET') {
      bug.status='NEU';bug.resolution='';
      db.prepare('UPDATE desk_bugs SET status=?,document_json=? WHERE id=?').bind(bug.status,JSON.stringify(bug),row.id).run();
    }
    db.prepare('UPDATE desk_bugs SET revision=revision+1,updated_at=? WHERE id=?').bind(now,row.id).run();
    return presentBug(rowById(db,row.id));
  });
}
