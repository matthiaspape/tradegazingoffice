// Explicit native test: own label/port/auth; optional authorized read of existing Fleet source.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,unlinkSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {sourceFile,privateJson,validateSources} from '../ops/fleet-reader.mjs';
import {agentContext,agentInstalled,agentJob,portOwners,writeAgent,startAgent,stopAgent,waitForExit,waitForOffice,officeAgentLabel} from '../ops/launch-agent.mjs';

if(process.platform!=='darwin')throw new Error('Native LaunchAgent-Prüfung benötigt macOS.');
const dataHome=mkdtempSync(resolve(tmpdir(),'office-m13-qa-'));
const context=agentContext({dataHome,label:`${officeAgentLabel}.qa-${process.pid}`,port:43122,throttle:1});
const token=randomBytes(32).toString('hex'),readFleet=process.env.OFFICE_AGENT_TEST_FLEET==='1';
const dummy=createServer((_request,response)=>{response.setHeader('content-type','application/json');response.end(JSON.stringify({name:'tradegazing-office-desk'}));});
const receipt={checked_at:new Date().toISOString(),isolated_port:43122,production_configuration_untouched:true};
const overrides=()=>execFileSync('/bin/launchctl',['print-disabled',context.domain],{encoding:'utf8'}).split('\n').filter(line=>line.includes(`"${context.spec.Label}"`));
assert.equal(existsSync(context.plist),false,'Unique QA plist must not replace existing work');
assert.equal(agentJob(context),null);
try{
 writeFileSync(resolve(dataHome,'local-auth.json'),JSON.stringify({token}),{mode:0o600});
 if(readFleet){const config=privateJson(sourceFile());validateSources(config);writeFileSync(resolve(dataHome,'fleet-sources.json'),JSON.stringify(config),{mode:0o600});}
 writeAgent(context);
 await new Promise((done,reject)=>{dummy.once('error',reject);dummy.listen(43122,'127.0.0.1',done);});
 await assert.rejects(()=>startAgent(context),/Port ist bereits belegt/);assert.equal(agentJob(context),null);
 await new Promise((done,reject)=>dummy.close(error=>error?reject(error):done()));
 receipt.foreign_health_process_rejected=true;
 await startAgent(context);
 const first=agentJob(context);assert.ok(first?.pid);assert.ok(portOwners(context).includes(first.pid));
 await startAgent(context);assert.equal(agentJob(context).pid,first.pid,'Normal start preserves running managed process');
 async function overview(){
  const r=await fetch(`${context.origin}/api/fleet-control/overview`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(50000)});
  assert.equal(r.status,200);const d=await r.json();assert.equal(d.mode,'NATIVE');assert.ok(d.hosts.length);
  assert.ok(d.hosts.every(h=>h.state==='CURRENT'));
  return {http_status:r.status,mode:d.mode,states:d.hosts.map(h=>h.state),observed_at:d.hosts.map(h=>h.observedAt)};
 }
 if(readFleet)receipt.fleet_before_restart=await overview();
 execFileSync('/bin/launchctl',['kill','SIGTERM',context.target]);
 await waitForExit(first.pid);await waitForOffice(context.origin);
 const restarted=agentJob(context);assert.ok(restarted?.pid&&restarted.pid!==first.pid);assert.ok(portOwners(context).includes(restarted.pid));
 if(readFleet)receipt.fleet_after_restart=await overview();
 await stopAgent(context);assert.equal(agentJob(context),null);
 await startAgent(context);assert.ok(agentJob(context)?.pid);
 Object.assign(receipt,{loaded_and_healthy:true,idempotent_start:true,automatic_restart_after_sigterm:true,intentional_stop_unloads_job:true,bootstrap_after_stop:true});
}finally{
 try{
  if(dummy.listening)await new Promise((done,reject)=>dummy.close(error=>error?reject(error):done()));
  if(existsSync(context.plist)&&agentInstalled(context))await stopAgent(context);
 }finally{
  try{if(existsSync(context.plist)&&agentInstalled(context))unlinkSync(context.plist);}
  finally{rmSync(dataHome,{recursive:true,force:true});}
 }
}
assert.equal(agentJob(context),null);assert.equal(existsSync(context.plist),false);assert.deepEqual(overrides(),[],'QA must not add a persistent enable override');
receipt.qa_resources_removed=true;receipt.new_qa_override=false;
const output=resolve(process.env.OFFICE_AGENT_REPORT||'work/launch-agent-native.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({native_launch_agent:'PASSED',foreign_port_rejected:true,automatic_restart:true,fleet_native_current:readFleet,qa_override:false}));
