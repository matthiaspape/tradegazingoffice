import { authorize } from '../../../ops/auth.mjs';
import { handle, readJson } from '../../../ops/http.mjs';
import { rpc } from '../../../ops/mcp.mjs';
export async function POST(request: Request) { return handle(async () => {
  const actor = authorize(request);
  let message;
  try { message = await readJson(request); } catch (error) {
    if (error instanceof Error && error.message === 'Ungültiges JSON.') return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    throw error;
  }
  const result = rpc(message, actor);
  return result ? Response.json(result) : new Response(null, { status: 202 });
}); }
export function GET() { return new Response(null, { status: 405, headers: { Allow: 'POST' } }); }
