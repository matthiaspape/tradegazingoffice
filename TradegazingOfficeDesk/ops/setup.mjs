import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { deskHome, databasePath } from './config.mjs';
import { applyContextMigration } from './migrate.mjs';
import { applyBugSchema } from './bug-schema.mjs';

// Explicit setup only. Server start and GET requests never create or seed tables.
mkdirSync(deskHome(), { recursive: true, mode: 0o700 });
if (!existsSync(databasePath())) {
  writeFileSync(databasePath(), '', { flag: 'wx', mode: 0o600 });
  const db = new DatabaseSync(databasePath());
  try {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE missions (
        id TEXT PRIMARY KEY, mission_number INTEGER NOT NULL UNIQUE,
        title TEXT NOT NULL, objective TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PLANNED','IN_PROGRESS','COMPLETED','DISCARDED')),
        mission_type TEXT NOT NULL, tags_json TEXT NOT NULL DEFAULT '[]',
        recommended_model TEXT NOT NULL, recommended_effort TEXT NOT NULL,
        briefing TEXT NOT NULL DEFAULT '', result_summary TEXT, link_label TEXT, link_url TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE mission_log_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT, mission_id TEXT NOT NULL REFERENCES missions(id),
        body TEXT NOT NULL, link_label TEXT, link_url TEXT, author TEXT NOT NULL,
        created_at TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'NOTE'
      );
      CREATE INDEX idx_mission_log_mission_id ON mission_log_entries(mission_id, id);
      PRAGMA user_version = 1;
      COMMIT;`);
    applyContextMigration(db);
    applyBugSchema(db);
  } finally { db.close(); }
}
const authFile = resolve(deskHome(), 'local-auth.json');
if (!existsSync(authFile)) writeFileSync(authFile, JSON.stringify({ token: randomBytes(32).toString('hex') }), { flag: 'wx', mode: 0o600 });
chmodSync(databasePath(), 0o600);
console.log('TradegazingOfficeDesk eingerichtet. Vorhandene Missionen bleiben erhalten.');
