// Adapted from TradegazingDesk's local stdio -> HTTP bridge.
// Token stays in the private data directory, never in argv or Codex configuration.
import { createInterface } from 'node:readline';
import { credentials } from './auth.mjs';
import { origin } from './config.mjs';
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  let message;
  try {
    if (Buffer.byteLength(line) > 65536) throw new Error('MCP request too large');
    try { message = JSON.parse(line); } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n'); continue; }
    const response = await fetch(`${origin}/api/mcp`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials().token}` }, body: line, signal: AbortSignal.timeout(30000) });
    if (response.status === 202) continue;
    if (!response.ok) throw new Error(`TradegazingOfficeDesk HTTP ${response.status}`);
    const reply = await response.json();
    process.stdout.write(JSON.stringify(reply) + '\n');
  } catch (error) {
    if (message?.id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32603, message: error.message === 'fetch failed' ? 'TradegazingOfficeDesk ist nicht erreichbar. Bitte den lokalen Desk starten.' : error.message } }) + '\n');
    else process.stderr.write('TradegazingOfficeDesk: Anfrage konnte nicht verarbeitet werden.\n');
  }
}
