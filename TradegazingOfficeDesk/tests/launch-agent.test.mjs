import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,symlinkSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {agentContext,plistXml,assertOwnedSpec,agentInstalled,parseAgentJob,explicitlyDisabled} from '../ops/launch-agent.mjs';

test('Office agent owns a separate label and starts foreground runtime with login and keepalive',()=>{
 const c=agentContext({home:'/tmp/test home',root:'/tmp/app root',dataHome:'/tmp/private data',node:'/tmp/node runtime',uid:501});
 assert.equal(c.spec.Label,'de.tradegazing.office-main-desk');
 assert.equal(c.target,'gui/501/de.tradegazing.office-main-desk');
 assert.equal(c.spec.RunAtLoad,true);assert.equal(c.spec.KeepAlive,true);
 assert.equal(c.spec.ProgramArguments[0],'/tmp/node runtime');
 assert.deepEqual(c.spec.ProgramArguments.slice(-5),['start','-H','127.0.0.1','-p','43120']);
 assert.deepEqual(c.spec.EnvironmentVariables,{TRADEGAZING_OFFICE_DESK_HOME:'/tmp/private data',TRADEGAZING_OFFICE_DESK_PORT:'43120',PATH:'/usr/bin:/bin:/usr/sbin:/sbin'});
 assert.equal(c.spec.ProcessType,undefined,'Use normal interactive-server scheduling, not Background throttling');
 assert.equal(c.spec.Umask,0o077);assert.equal(c.spec.ThrottleInterval,30);
});
test('only an explicit disabled override for this exact label needs enabling',()=>{
 const label='de.tradegazing.office-main-desk';
 assert.equal(explicitlyDisabled(`"${label}" => disabled`,label),true);
 assert.equal(explicitlyDisabled(`"${label}" => true`,label),true);
 assert.equal(explicitlyDisabled(`"${label}" => enabled`,label),false);
 assert.equal(explicitlyDisabled(`"${label}.qa-other" => disabled`,label),false);
 assert.equal(explicitlyDisabled('',label),false);
});
test('plist roundtrip preserves spaces and XML-special characters without shell expansion',{skip:process.platform!=='darwin'},()=>{
 const c=agentContext({root:'/tmp/app & <root> "x"',dataHome:"/tmp/a 'b'",node:'/tmp/node & runtime'});
 const result=execFileSync('/usr/bin/plutil',['-convert','json','-o','-','-'],{input:plistXml(c.spec),encoding:'utf8'});
 assert.deepEqual(JSON.parse(result),c.spec);
});
test('foreign labels, roots, credentials namespace and public bindings are preserved',()=>{
 const {spec}=agentContext();
 for(const change of [s=>s.Label='de.tradegazing.office-desk',s=>s.WorkingDirectory='/tmp/foreign',s=>s.EnvironmentVariables.TRADEGAZING_OFFICE_DESK_HOME='/tmp/foreign',s=>s.ProgramArguments[4]='0.0.0.0']){
  const other=structuredClone(spec);change(other);assert.throws(()=>assertOwnedSpec(other,spec),/Fremde/);
 }
 const updatedNode=structuredClone(spec);updatedNode.ProgramArguments[0]='/new/node';assert.doesNotThrow(()=>assertOwnedSpec(updatedNode,spec));
});
test('linked and foreign-owner plist files are rejected before launchctl actions',()=>{
 const home=mkdtempSync(resolve(tmpdir(),'office-agent-test-'));
 try{
  const c=agentContext({home});mkdirSync(dirname(c.plist),{recursive:true});
  const other=resolve(home,'other.plist');writeFileSync(other,plistXml(c.spec));symlinkSync(other,c.plist);
  assert.throws(()=>agentInstalled(c),/Fremder/);
  assert.throws(()=>agentInstalled({...c,plist:other,uid:process.getuid()+1}),/Fremder/);
 }finally{rmSync(home,{recursive:true,force:true});}
});
test('loaded service must come from the owned plist path',()=>{
 const c=agentContext();
 assert.deepEqual(parseAgentJob(`service = {\n path = ${c.plist}\n pid = 123\n}`,c),{pid:123});
 assert.throws(()=>parseAgentJob('service = {\n path = /tmp/foreign.plist\n pid = 123\n}',c),/Fremdes/);
});
test('legacy stop preserves an unrelated PID and tolerates an already stopped instance',()=>{
 const home=mkdtempSync(resolve(tmpdir(),'office-stop-test-'));
 const env={...process.env,TRADEGAZING_OFFICE_DESK_HOME:home,TRADEGAZING_OFFICE_DESK_PORT:'43122'};
 try{
  const stopped=spawnSync(process.execPath,['ops/stop.mjs'],{env,encoding:'utf8'});assert.equal(stopped.status,0);
  const pidFile=resolve(home,'server.pid');writeFileSync(pidFile,String(process.pid));
  const refused=spawnSync(process.execPath,['ops/stop.mjs'],{env,encoding:'utf8'});assert.notEqual(refused.status,0);assert.match(refused.stderr,/gehört nicht/);
  assert.equal(readFileSync(pidFile,'utf8'),String(process.pid));
 }finally{rmSync(home,{recursive:true,force:true});}
});
