import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deskHome } from './config.mjs';
const pidFile = resolve(deskHome(), 'server.pid');
const pid = Number(readFileSync(pidFile, 'utf8'));
if (!Number.isSafeInteger(pid) || pid <= 1) throw new Error('Ungültige Prozessnummer.');
const cli = fileURLToPath(new URL('../node_modules/vinext/dist/cli.js', import.meta.url));
let command = '';
try { command = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }); } catch { /* Already stopped. */ }
if (command) {
  if (!command.includes(cli) || !command.includes('43120')) throw new Error('Prozess gehört nicht zu diesem Desk; nicht beendet.');
  process.kill(pid, 'SIGTERM');
}
unlinkSync(pidFile);
console.log('TradegazingOfficeDesk beendet.');
