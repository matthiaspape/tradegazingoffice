import { authorize } from '../../../../ops/auth.mjs';
import { handle } from '../../../../ops/http.mjs';
import { fleetHistory } from '../../../../ops/fleet-reader.mjs';

export async function GET(request: Request) {
  return handle(async () => {
    authorize(request);
    const query=new URL(request.url).searchParams;
    const host=query.get('host') ?? '';
    const hours=query.get('hours');
    const after=query.get('after') ?? '';
    const identity=query.get('identity') ?? '';
    if (Array.from(query.keys()).some(key=>!['host','hours','after','identity'].includes(key) || query.getAll(key).length!==1) ||
        !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(host) || (hours!=='24' && hours!=='168') ||
        (query.has('after') && (!/^[0-9a-f]{32}$/.test(after) || !/^[0-9a-f]{64}$/.test(identity))) ||
        (query.has('identity') && !/^[0-9a-f]{64}$/.test(identity))) {
      return Response.json({error:'Ungültiges Beobachtungsfenster oder Cursor.'},{status:400});
    }
    return Response.json(await fleetHistory(host,Number(hours),after,identity),{headers:{'Cache-Control':'no-store'}});
  });
}
