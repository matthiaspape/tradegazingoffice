import { NextResponse, type NextRequest } from 'next/server';
import { checkBoundary } from './ops/auth.mjs';
export function middleware(request: NextRequest) {
  try { checkBoundary(request); } catch { return NextResponse.json({ error: 'Nur lokaler Zugriff erlaubt.' }, { status: 403 }); }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
