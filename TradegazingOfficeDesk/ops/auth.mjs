import { readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { deskHome, origin } from './config.mjs';
import { DeskError } from './contract.mjs';
const cookieName = 'tradegazing-office-desk-session';
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function credentials() {
  const path = resolve(deskHome(), 'local-auth.json');
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || (stat.mode & 0o077)) throw new Error();
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(data.token)) throw new Error();
    return data;
  } catch { throw new DeskError('Lokaler Zugang ist noch nicht eingerichtet oder nicht lesbar.', 503); }
}
export function checkBoundary(request) {
  const url = new URL(request.url);
  if (url.origin !== origin || request.headers.get('host') !== new URL(origin).host) throw new DeskError('Nur lokaler Zugriff erlaubt.', 403);
  const requestOrigin = request.headers.get('origin'), site = request.headers.get('sec-fetch-site');
  if ((requestOrigin && requestOrigin !== origin) || (site && !['none', 'same-origin'].includes(site))) throw new DeskError('Fremder Ursprung ist nicht erlaubt.', 403);
}
const sign = (value, token) => createHmac('sha256', token).update(value).digest('hex');
export function sessionCookie() {
  const expiry = String(Date.now() + 43200000);
  return `${cookieName}=${expiry}.${sign(expiry, credentials().token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`;
}
export function authorize(request) {
  checkBoundary(request);
  const { token } = credentials();
  if (equal(request.headers.get('authorization'), `Bearer ${token}`)) return 'Codex';
  const value = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || '';
  const [expiry, signature, extra] = value.split('.');
  if (extra !== undefined || !/^\d{13}$/.test(expiry) || Number(expiry) <= Date.now() || Number(expiry) > Date.now() + 43200000 || !equal(signature, sign(expiry, token))) throw new DeskError('Sitzung abgelaufen. Bitte die Seite neu laden.', 401);
  if (request.method !== 'GET' && (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') !== 'same-origin')) throw new DeskError('Nur Änderungen von dieser Seite sind erlaubt.', 403);
  return 'Matthias';
}
