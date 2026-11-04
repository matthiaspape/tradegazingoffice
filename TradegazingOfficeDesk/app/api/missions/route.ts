import { authorize } from '../../../ops/auth.mjs';
import { handle, readJson, restFields } from '../../../ops/http.mjs';
import { snapshot, createMission, updateMission } from '../../../ops/store.mjs';
import { object } from '../../../ops/contract.mjs';
export async function GET(request: Request) { return handle(() => { authorize(request); return Response.json(snapshot()); }); }
export async function POST(request: Request) { return handle(async () => { const actor = authorize(request); return Response.json(createMission(restFields(object(await readJson(request))), actor), { status: 201 }); }); }
export async function PATCH(request: Request) { return handle(async () => { const actor = authorize(request); const { id, expectedVersion, ...fields } = object(await readJson(request)); return Response.json(updateMission(id, restFields(fields), actor, expectedVersion)); }); }
