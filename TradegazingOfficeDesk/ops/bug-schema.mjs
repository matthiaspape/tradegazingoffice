import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deskHome, databasePath } from './config.mjs';

export const bugSchemaColumns={
  bug_board_schema:['version'],
  desk_bugs:['number','id','title','status','risk','revision','document_json','created_at','updated_at'],
  bug_occurrences:['id','bug_id','mission_id','run_id','stage','decision','document_json','actor','created_at'],
  bug_events:['id','bug_id','request_key','request_sha256','action','actor','response_json','created_at'],
};

export const bugSchemaSQL=`
CREATE TABLE bug_board_schema(version INTEGER PRIMARY KEY CHECK(version=1));
INSERT INTO bug_board_schema VALUES(1);
CREATE TABLE desk_bugs(
  number INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  risk TEXT NOT NULL,
  revision INTEGER NOT NULL,
  document_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE bug_occurrences(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id TEXT NOT NULL REFERENCES desk_bugs(id),
  mission_id TEXT REFERENCES missions(id),
  run_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  decision TEXT NOT NULL,
  document_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX bug_occurrences_mission ON bug_occurrences(mission_id,bug_id);
CREATE INDEX bug_occurrences_context ON bug_occurrences(bug_id,mission_id,run_id,stage,id);
CREATE TABLE bug_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id TEXT NOT NULL REFERENCES desk_bugs(id),
  request_key TEXT NOT NULL UNIQUE,
  request_sha256 TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX bug_events_bug ON bug_events(bug_id,id);
CREATE INDEX desk_bugs_status_risk ON desk_bugs(status,risk);
`;

// Called only by the explicit offline CLI or isolated test setup, never by reads/start.
export function applyBugSchema(db) {
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; BEGIN IMMEDIATE');
  try {
    const present=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('bug_board_schema','desk_bugs','bug_occurrences','bug_events')").all();
    if(present.length) {
      if(present.length!==4||db.prepare('SELECT version FROM bug_board_schema').get()?.version!==1) throw new Error('Unvollständiges oder unbekanntes Bug-Board-Schema; keine automatische Reparatur.');
      for(const [table,columns] of Object.entries(bugSchemaColumns))db.prepare(`SELECT ${columns.join(',')} FROM ${table} LIMIT 0`).all();
      db.exec('ROLLBACK'); return {schema_version:1,created:false};
    }
    if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='missions'").get()) throw new Error('Bestehender Desk-Missionsbestand erforderlich.');
    db.exec(bugSchemaSQL);
    db.exec('COMMIT'); return {schema_version:1,created:true};
  } catch(error) { if(db.isTransaction) db.exec('ROLLBACK'); throw error; }
}
export function initializeBugBoard({approved=false,offline=false}={}) {
  if(!approved||!offline) throw new Error('Explizite Offline-Schemaeinrichtung erforderlich: --apply --offline (Office Desk zuvor stoppen).');
  if(!existsSync(databasePath())) throw new Error('Office Desk zuerst mit setup einrichten.');
  const pidFile=resolve(deskHome(),'server.pid');
  if(existsSync(pidFile)) {
    const pid=Number(readFileSync(pidFile,'utf8'));
    if(!Number.isSafeInteger(pid)||pid<=1) throw new Error('Ungültige Prozessdatei; Betriebszustand zuerst klären.');
    try { process.kill(pid,0); throw new Error('Office Desk zuerst stoppen.'); }
    catch(error) { if(error.code!=='ESRCH') throw error; }
  }
  const db=new DatabaseSync(databasePath());
  try { return applyBugSchema(db); } finally { db.close(); }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  const flags=process.argv.slice(2);
  if(flags.some(f=>!['--apply','--offline'].includes(f))) throw new Error('Unbekannter Parameter.');
  console.log(JSON.stringify(initializeBugBoard({approved:flags.includes('--apply'),offline:flags.includes('--offline')})));
}
