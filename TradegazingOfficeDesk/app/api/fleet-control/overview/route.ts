import { authorize } from '../../../../ops/auth.mjs';
import { handle } from '../../../../ops/http.mjs';
import { fleetOverview } from '../../../../ops/fleet-reader.mjs';
export async function GET(request: Request) {
  return handle(async () => {
    authorize(request);
    if (new URL(request.url).search) return Response.json({error:'Keine Quellparameter erlaubt.'},{status:400});
    return Response.json(await fleetOverview(),{headers:{'Cache-Control':'no-store'}});
  });
}
