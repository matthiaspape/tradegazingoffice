import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Resolve relative to this installation, independent of the caller's working directory.
export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const deskHome = () => resolve(process.env.TRADEGAZING_OFFICE_DESK_HOME || resolve(projectRoot, '.office-desk-data'));
export const databasePath = () => resolve(deskHome(), 'missions.sqlite');
const port = Number(process.env.TRADEGAZING_OFFICE_DESK_PORT || 43120);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Ungültiger lokaler Office-Port.');
export const origin = `http://127.0.0.1:${port}`;
