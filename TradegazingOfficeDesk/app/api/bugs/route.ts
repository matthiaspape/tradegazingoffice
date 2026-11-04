import { authorize } from '../../../ops/auth.mjs';
import { handle, readJson } from '../../../ops/http.mjs';
import { BugError } from '../../../ops/bug-contract.mjs';
import { listBugs, getBug, createBug, updateBug, addBugOccurrence } from '../../../ops/bug-board.mjs';

export const dynamic = 'force-dynamic';
async function respond(action: () => unknown | Promise<unknown>) {
  try { return Response.json(await action(), { headers: { 'cache-control': 'no-store' } }); }
  catch (error) {
    if (error instanceof BugError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers: { 'cache-control': 'no-store' } });
    throw error;
  }
}
export async function GET(request: Request) {
  return handle(() => {
    authorize(request);
    return respond(() => {
      const params = new URL(request.url).searchParams;
      if (params.has('id')) {
        if (params.size !== 1) throw new BugError('Detailabruf erwartet ausschließlich id.');
        return getBug(params.get('id'));
      }
      const filters: Record<string, unknown> = Object.fromEntries(params);
      for (const key of ['limit', 'offset']) if (params.has(key)) filters[key] = Number(params.get(key));
      return listBugs(filters);
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => { const actor = authorize(request); return respond(async () => createBug(await readJson(request), actor)); });
}
export async function PATCH(request: Request) {
  return handle(async () => { const actor = authorize(request); return respond(async () => updateBug(await readJson(request), actor)); });
}
export async function PUT(request: Request) {
  return handle(async () => { const actor = authorize(request); return respond(async () => addBugOccurrence(await readJson(request), actor)); });
}
