import { checkBoundary, sessionCookie } from '../../../../ops/auth.mjs';
import { handle } from '../../../../ops/http.mjs';
import { DeskError } from '../../../../ops/contract.mjs';
import { origin } from '../../../../ops/config.mjs';
export async function POST(request: Request) { return handle(() => {
  checkBoundary(request);
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') !== 'same-origin' || request.headers.get('x-desk-session') !== '1') throw new DeskError('Nur von der lokalen Webseite erreichbar.', 403);
  return Response.json({ mode: 'LOCAL' }, { headers: { 'Set-Cookie': sessionCookie(), 'Cache-Control': 'no-store' } });
}); }
