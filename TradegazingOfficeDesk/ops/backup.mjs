import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './store.mjs';
import { deskHome } from './config.mjs';
export async function createBackup() {
  const directory = resolve(deskHome(), 'backups');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const target = resolve(directory, `missions-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0,8)}.sqlite`);
  const source = openDatabase();
  try { await backup(source, target); } finally { source.close(); }
  chmodSync(target, 0o600);
  const check = new DatabaseSync(target, { readOnly: true });
  try {
    if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || check.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Sicherungsprüfung fehlgeschlagen.');
  } finally { check.close(); }
  return target;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(await createBackup());
