import { bugKeys } from './bug-contract.mjs';
import { listBugs,getBug,createBug,updateBug,addBugOccurrence } from './bug-board.mjs';
export { bugTools } from './bug-tools.mjs';

export const bugWriteTools=['bug_create','bug_update','bug_add_occurrence'];
export function callBugTool(name,args,actor) {
  if(name==='bug_list')return listBugs(args);
  if(name==='bug_get'){bugKeys(args,['id']);return getBug(args.id);}
  if(name==='bug_create')return createBug(args,actor);
  if(name==='bug_update')return updateBug(args,actor);
  if(name==='bug_add_occurrence')return addBugOccurrence(args,actor);
  throw new Error('Unbekanntes Bug-Werkzeug.');
}
