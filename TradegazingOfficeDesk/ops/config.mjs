import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Resolve relative to this installation, independent of the caller's working directory.
export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const deskHome = () => resolve(process.env.TRADEGAZING_OFFICE_DESK_HOME || resolve(projectRoot, '.office-desk-data'));
export const databasePath = () => resolve(deskHome(), 'missions.sqlite');
export const origin = 'http://127.0.0.1:43120';
