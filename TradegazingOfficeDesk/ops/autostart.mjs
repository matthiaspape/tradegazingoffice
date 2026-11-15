import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {credentials} from './auth.mjs';
import {origin} from './config.mjs';
import {agentContext,agentInstalled,agentJob,portOwners,writeAgent,startAgent} from './launch-agent.mjs';

if(process.platform!=='darwin'||origin!=='http://127.0.0.1:43120')throw new Error('Autostart ist für den regulären macOS-Office-Desk vorgesehen.');
credentials();
const context=agentContext();
if(!existsSync(context.spec.ProgramArguments[1])||!existsSync(resolve(context.spec.WorkingDirectory,'dist/server/index.js')))throw new Error('Office-Laufzeit und vorhandener Build werden benötigt.');
// Check ownership before stopping the current Office or writing a persistent job.
const installed=agentInstalled(context);
if(!installed&&agentJob(context))throw new Error('LaunchAgent-Label ist bereits belegt.');
if(installed)agentJob(context);
execFileSync(process.execPath,[resolve(context.spec.WorkingDirectory,'ops/stop.mjs')],{stdio:['ignore','pipe','pipe']});
if(portOwners(context).length)throw new Error('Office-Port ist noch belegt; vorhandener Prozess bleibt unverändert, kein Autostart eingerichtet.');
writeAgent(context);
await startAgent(context);
console.log(JSON.stringify({status:'OFFICE_AUTOSTART_ENABLED',label:context.spec.Label,url:context.origin,start:'USER_LOGIN',keep_alive:true,existing_data_preserved:true}));
