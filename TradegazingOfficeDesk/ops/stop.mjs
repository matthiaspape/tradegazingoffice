import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deskHome,origin } from './config.mjs';
import {agentContext,stopAgent,waitForExit} from './launch-agent.mjs';
const pidFile = resolve(deskHome(), 'server.pid');
if(process.platform==='darwin'&&origin==='http://127.0.0.1:43120'&&await stopAgent(agentContext())){
  if(existsSync(pidFile))unlinkSync(pidFile);
  console.log('TradegazingOfficeDesk-LaunchAgent beendet. Autostart bei nächster Anmeldung bleibt eingerichtet.');process.exit(0);
}
if(!existsSync(pidFile)){console.log('TradegazingOfficeDesk bereits beendet.');process.exit(0);}
const pid = Number(readFileSync(pidFile, 'utf8'));
if (!Number.isSafeInteger(pid) || pid <= 1) throw new Error('Ungültige Prozessnummer.');
const cli = fileURLToPath(new URL('../node_modules/vinext/dist/cli.js', import.meta.url));
let command = '';
try { command = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }); } catch { /* Already stopped. */ }
if (command) {
  if (!command.includes(cli) || !command.includes('43120')) throw new Error('Prozess gehört nicht zu diesem Desk; nicht beendet.');
  process.kill(pid, 'SIGTERM');
  await waitForExit(pid);
}
unlinkSync(pidFile);
console.log('TradegazingOfficeDesk beendet.');
