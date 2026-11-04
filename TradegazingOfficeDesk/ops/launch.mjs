import { spawn } from 'node:child_process';
import { existsSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deskHome, origin } from './config.mjs';
import { credentials } from './auth.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
async function running() {
  try {
    const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok && (await response.json()).name === 'tradegazing-office-desk';
  } catch { return false; }
}
if (await running()) { console.log(origin); process.exit(0); }
credentials();
if (!existsSync(resolve(root, 'dist/server/index.js'))) throw new Error('Bitte zuerst npm run build ausführen.');
const log = openSync(resolve(deskHome(), 'server.log'), 'a', 0o600);
const child = spawn(process.execPath, [resolve(root, 'node_modules/vinext/dist/cli.js'), 'start', '-H', '127.0.0.1', '-p', '43120'], {
  cwd: root, env: { ...process.env, TRADEGAZING_OFFICE_DESK_HOME: deskHome() }, detached: true, stdio: ['ignore', log, log],
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
closeSync(log);
let ready = false;
for (let i = 0; i < 40; i++) {
  if (child.exitCode !== null) break;
  if (await running()) { ready = true; break; }
  await new Promise(done => setTimeout(done, 250));
}
if (!ready) { child.kill(); throw new Error('Desk konnte nicht starten. Details stehen im lokalen server.log.'); }
writeFileSync(resolve(deskHome(), 'server.pid'), String(child.pid), { mode: 0o600 });
child.unref();
console.log(origin);
