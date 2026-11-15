import {execFileSync} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {deskHome} from './config.mjs';

export const officeAgentLabel='de.tradegazing.office-main-desk';
export function agentContext({home=homedir(),dataHome=deskHome(),root=fileURLToPath(new URL('..',import.meta.url)),node=process.execPath,uid=process.getuid(),port=43120,label=officeAgentLabel,throttle=30}={}){
 if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Ungültiger Office-Port.');
 if(!/^de\.tradegazing\.office-main-desk(?:\.qa-[a-z0-9-]+)?$/.test(label))throw new Error('Ungültiges Office-Agentlabel.');
 root=resolve(root);dataHome=resolve(dataHome);
 const plist=resolve(home,'Library/LaunchAgents',`${label}.plist`);
 const spec={Label:label,ProgramArguments:[node,resolve(root,'node_modules/vinext/dist/cli.js'),'start','-H','127.0.0.1','-p',String(port)],WorkingDirectory:root,
  EnvironmentVariables:{TRADEGAZING_OFFICE_DESK_HOME:dataHome,TRADEGAZING_OFFICE_DESK_PORT:String(port)},
  RunAtLoad:true,KeepAlive:true,ThrottleInterval:throttle,Umask:0o077,ProcessType:'Background',
  StandardOutPath:resolve(dataHome,'server.log'),StandardErrorPath:resolve(dataHome,'server.log')};
 return {plist,spec,uid,target:`gui/${uid}/${label}`,domain:`gui/${uid}`,origin:`http://127.0.0.1:${port}`};
}
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export function plistXml(spec){
 const encode=value=>typeof value==='boolean'?`<${value}/>`:typeof value==='number'?`<integer>${value}</integer>`:typeof value==='string'?`<string>${escape(value)}</string>`:Array.isArray(value)?`<array>${value.map(encode).join('')}</array>`:`<dict>${Object.entries(value).map(([key,v])=>`<key>${escape(key)}</key>${encode(v)}`).join('')}</dict>`;
 return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">${encode(spec)}</plist>\n`;
}
export function assertOwnedSpec(actual,expected){
 if(actual.Label!==expected.Label||actual.WorkingDirectory!==expected.WorkingDirectory||
    actual.EnvironmentVariables?.TRADEGAZING_OFFICE_DESK_HOME!==expected.EnvironmentVariables.TRADEGAZING_OFFICE_DESK_HOME||
    actual.EnvironmentVariables?.TRADEGAZING_OFFICE_DESK_PORT!==expected.EnvironmentVariables.TRADEGAZING_OFFICE_DESK_PORT||
    JSON.stringify(actual.ProgramArguments?.slice(1))!==JSON.stringify(expected.ProgramArguments.slice(1)))throw new Error('Fremde LaunchAgent-Konfiguration bleibt unverändert.');
}
export function agentInstalled(context){
 if(!existsSync(context.plist))return false;
 const stat=lstatSync(context.plist);
 if(!stat.isFile()||stat.uid!==context.uid)throw new Error('Fremder oder verknüpfter LaunchAgent bleibt unverändert.');
 const spec=JSON.parse(execFileSync('/usr/bin/plutil',['-convert','json','-o','-',context.plist],{encoding:'utf8'}));
 assertOwnedSpec(spec,context.spec);return true;
}
export function parseAgentJob(output,context){
 const path=output.match(/^\s*path = (.+)$/m)?.[1];
 if(path!==context.plist)throw new Error('Fremdes geladenes LaunchAgent-Label bleibt unverändert.');
 return {pid:Number(output.match(/^\s*pid = (\d+)$/m)?.[1])||null};
}
export function agentJob(context){
 try{
  const output=execFileSync('/bin/launchctl',['print',context.target],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return parseAgentJob(output,context);
 }catch(error){
  if(String(error.stderr||'').includes('Could not find service'))return null;
  throw error;
 }
}
export async function waitForExit(pid){
 for(let i=0;i<100;i++){
  try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')return;throw error;}
  await new Promise(done=>setTimeout(done,100));
 }
 throw new Error('Office-Prozess wurde noch nicht beendet.');
}
export async function waitForOffice(origin){
 for(let i=0;i<60;i++){
  try{const r=await fetch(`${origin}/api/health`,{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json()).name==='tradegazing-office-desk')return;}catch{}
  await new Promise(done=>setTimeout(done,250));
 }
 throw new Error('Office-Start nicht erfolgreich; Details stehen im privaten server.log.');
}
export async function startAgent(context){
 if(!agentInstalled(context))throw new Error('Office-Autostart ist nicht eingerichtet.');
 if(!agentJob(context))execFileSync('/bin/launchctl',['bootstrap',context.domain,context.plist],{stdio:['ignore','pipe','pipe']});
 execFileSync('/bin/launchctl',['kickstart',context.target],{stdio:['ignore','pipe','pipe']});
 await waitForOffice(context.origin);
}
export async function stopAgent(context){
 if(!agentInstalled(context))return false;
 const job=agentJob(context);if(!job)return false;
 execFileSync('/bin/launchctl',['bootout',context.target],{stdio:['ignore','pipe','pipe']});
 if(job.pid)await waitForExit(job.pid);
 return true;
}
export function writeAgent(context){
 const installed=agentInstalled(context);
 if(!installed&&agentJob(context))throw new Error('LaunchAgent-Label ist bereits belegt.');
 mkdirSync(resolve(context.plist,'..'),{recursive:true});
 const xml=plistXml(context.spec);
 if(!installed)writeFileSync(context.plist,xml,{flag:'wx',mode:0o600});
 else{
  const temporary=`${context.plist}.${randomUUID()}.tmp`;
  try{writeFileSync(temporary,xml,{flag:'wx',mode:0o600});renameSync(temporary,context.plist);}
  finally{if(existsSync(temporary))unlinkSync(temporary);}
 }
 execFileSync('/bin/launchctl',['enable',context.target],{stdio:['ignore','pipe','pipe']});
}
