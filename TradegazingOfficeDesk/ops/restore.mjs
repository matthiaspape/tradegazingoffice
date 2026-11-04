import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, copyFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [sourceArg, targetArg] = process.argv.slice(2);
if (!sourceArg || !targetArg) throw new Error('Aufruf: node ops/restore.mjs SICHERUNG.sqlite NEUES_VERZEICHNIS');
const source = resolve(sourceArg), target = resolve(targetArg);
const check = new DatabaseSync(source, { readOnly: true });
try {
  const version = check.prepare('PRAGMA user_version').get().user_version;
  if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || check.prepare('PRAGMA foreign_key_check').all().length || ![1, 2].includes(version)) throw new Error('Ungültige Tradegazing Office-Sicherung.');
  check.prepare('SELECT id, version FROM missions LIMIT 1').all();
  check.prepare('SELECT mission_id, kind FROM mission_log_entries LIMIT 1').all();
  if (version === 2) {
    check.prepare('SELECT id, version, sources_json FROM context_entries LIMIT 1').all();
    check.prepare('SELECT entry_id, version, snapshot_json FROM context_revisions LIMIT 1').all();
  }
} finally { check.close(); }
// An existing destination is never overwritten, including an empty directory.
mkdirSync(target, { mode: 0o700 });
const destination = resolve(target, 'missions.sqlite');
copyFileSync(source, destination); chmodSync(destination, 0o600);
execFileSync(process.execPath, [fileURLToPath(new URL('./setup.mjs', import.meta.url))], { env: { ...process.env, TRADEGAZING_OFFICE_DESK_HOME: target }, stdio: 'pipe' });
console.log(`Wiederhergestellt: ${target}. Zugangsschlüssel wurde neu erzeugt. Der laufende Desk wurde nicht umgestellt.`);
