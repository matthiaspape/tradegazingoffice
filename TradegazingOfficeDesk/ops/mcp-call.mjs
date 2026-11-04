// Local fallback for agent sessions whose MCP tool catalog has not reloaded yet.
// Usage: node ops/mcp-call.mjs TOOL [JSON_FILE|-]. Credentials never leave this process.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { credentials } from './auth.mjs';
import { origin } from './config.mjs';

export async function callMcpTool(name, args = {}) {
  const response = await fetch(`${origin}/api/mcp`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials().token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/call', params: { name, arguments: args } }),
  });
  if (!response.ok) throw new Error(`TradegazingOfficeDesk HTTP ${response.status}`);
  const reply = await response.json();
  if (reply.error || reply.result?.isError) throw new Error(reply.error?.message || reply.result.content?.[0]?.text || 'MCP-Werkzeug fehlgeschlagen.');
  if (!reply.result?.structuredContent) throw new Error('Ungültige MCP-Antwort.');
  return reply.result.structuredContent;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [name, input] = process.argv.slice(2);
    if (!name) throw new Error('Aufruf: node ops/mcp-call.mjs WERKZEUG [JSON_DATEI|-]');
    const raw = input ? readFileSync(input === '-' ? 0 : input, 'utf8') : '{}';
    if (Buffer.byteLength(raw) > 65536) throw new Error('Anfrage ist zu groß.');
    console.log(JSON.stringify(await callMcpTool(name, JSON.parse(raw)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
