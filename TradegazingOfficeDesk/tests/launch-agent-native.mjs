// Explicit native test: own temporary label, isolated port/data; no production registration.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,unlinkSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {agentContext,agentInstalled,agentJob,writeAgent,startAgent,stopAgent,waitForExit,waitForOffice,officeAgentLabel} from '../ops/launch-agent.mjs';

if(process.platform!=='darwin')throw new Error('Native LaunchAgent-Prüfung benötigt macOS.');
const dataHome=mkdtempSync(resolve(tmpdir(),'office-m13-qa-'));
const context=agentContext({dataHome,label:`${officeAgentLabel}.qa-${process.pid}`,port:43122,throttle:1});
let installed=false;
try{
 writeAgent(context);installed=true;
 await startAgent(context);
 const first=agentJob(context);assert.ok(first?.pid);
 execFileSync('/bin/launchctl',['kill','SIGTERM',context.target]);
 await waitForExit(first.pid);await waitForOffice(context.origin);
 const restarted=agentJob(context);assert.ok(restarted?.pid&&restarted.pid!==first.pid);
 await stopAgent(context);assert.equal(agentJob(context),null);
 await startAgent(context);assert.ok(agentJob(context)?.pid);
 const output=resolve(process.env.OFFICE_AGENT_REPORT||'work/launch-agent-native.json');mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify({checked_at:new Date().toISOString(),isolated_port:43122,loaded_and_healthy:true,automatic_restart_after_sigterm:true,intentional_stop_unloads_job:true,bootstrap_after_stop:true,production_untouched:true},null,2)+'\n');
 console.log(JSON.stringify({native_launch_agent:'PASSED',automatic_restart:true,stop_and_bootstrap:true,production_untouched:true}));
}finally{
 if(installed&&agentInstalled(context)){await stopAgent(context);unlinkSync(context.plist);}
 rmSync(dataHome,{recursive:true,force:true});
}
