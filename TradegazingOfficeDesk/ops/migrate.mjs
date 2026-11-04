import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase } from './store.mjs';
import { createBackup } from './backup.mjs';

// Only called by explicit setup/migration commands, never by an HTTP request.
export function applyContextMigration(db) {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version === 2) return false;
  if (version !== 1) throw new Error('Unbekannte Datenbankversion; keine Migration ausgeführt.');
  try { db.exec(readFileSync(new URL('./migrations/002-context.sql', import.meta.url), 'utf8')); }
  catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  db.exec('PRAGMA optimize');
  return true;
}
export async function migrate() {
  const db = openDatabase();
  try {
    if (db.prepare('PRAGMA user_version').get().user_version === 2) return { changed: false, version: 2 };
    const backup = await createBackup();
    applyContextMigration(db);
    return { changed: true, version: 2, backup };
  } finally { db.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(JSON.stringify(await migrate()));
