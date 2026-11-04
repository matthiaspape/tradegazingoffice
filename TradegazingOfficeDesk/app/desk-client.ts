export async function ensureDeskSession() {
  const response = await fetch('/api/local/session', { method: 'POST', headers: { 'content-type': 'application/json', 'x-desk-session': '1' }, body: '{}' });
  if (!response.ok) throw new Error((await response.json()).error || 'Bitte die Seite neu laden.');
}
export async function invokeDeskTool(name: string, input: unknown = {}) {
  const response = await fetch('/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/call', params: { name, arguments: input } }) });
  const reply = await response.json();
  if (!response.ok || reply.error || reply.result?.isError) throw new Error(reply.error?.message || reply.error || reply.result?.content?.[0]?.text || 'Zugriff fehlgeschlagen.');
  return reply.result.structuredContent;
}
