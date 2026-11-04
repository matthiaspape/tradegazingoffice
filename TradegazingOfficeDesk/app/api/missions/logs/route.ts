import { authorize } from '../../../../ops/auth.mjs';
import { handle, readJson, restFields } from '../../../../ops/http.mjs';
import { addMissionLog } from '../../../../ops/store.mjs';
import { object } from '../../../../ops/contract.mjs';
export async function POST(request: Request) { return handle(async () => { const actor = authorize(request); const { missionId, ...fields } = object(await readJson(request)); return Response.json(addMissionLog(missionId, restFields(fields), actor), { status: 201 }); }); }
