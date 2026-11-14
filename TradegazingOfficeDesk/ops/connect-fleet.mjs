// Registers a distinct, revocable Office reader against the already installed Mac backend.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isIP } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { deskHome } from './config.mjs';
import { privateJson, validateSources, sourceFile, fetchJson } from './fleet-reader.mjs';

function replace(path, value, expected) {
 const previous=existsSync(path)?readFileSync(path,'utf8'):null;
 if(previous!==expected)throw new Error('Datei wurde zwischenzeitlich geändert; vorhandenen Stand erhalten.');
 const temporary=`${path}.${randomBytes(8).toString('hex')}.tmp`;
 try {writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});renameSync(temporary,path);}
 finally {if(existsSync(temporary))unlinkSync(temporary);}
}
export async function connectFleet(macConfigPath,{fetcher=fetch,ip=null}={}) {
 const settings=privateJson(macConfigPath);
 const devicesPath=settings.credentials_file;
 const devices=privateJson(devicesPath), expectedDevices=readFileSync(devicesPath,'utf8');
 if(!Array.isArray(devices.devices)||!Number.isInteger(settings.port)||settings.port<1024||settings.port>65535)throw new Error('Ungültige Mac-Readerkonfiguration.');
 mkdirSync(deskHome(),{recursive:true,mode:0o700});
 const keyPath=resolve(deskHome(),'fleet-reader-key.txt'), name='tradegazing-office-server';
 let token;
 if(existsSync(keyPath)) {const keyStat=await import('node:fs');if((keyStat.lstatSync(keyPath).mode&0o077)||!keyStat.lstatSync(keyPath).isFile())throw new Error('Leseschlüssel muss geschützt sein.');token=readFileSync(keyPath,'utf8').trim();}
 else {token=randomBytes(40).toString('base64url');writeFileSync(keyPath,token+'\n',{mode:0o600,flag:'wx'});}
 const sha256=createHash('sha256').update(token).digest('hex');
 const old=devices.devices.find(d=>d.name===name);
 if(old&&(old.sha256!==sha256||old.enabled!==true||old.owner!=='Matthias'))throw new Error('Bestehende abweichende oder widerrufene Office-Berechtigung erhalten.');
 if(!old)replace(devicesPath,{...devices,devices:[...devices.devices,{name,owner:'Matthias',enabled:true,sha256}]},expectedDevices);
 const endpoint=`http://127.0.0.1:${settings.port}/`;
 const health=await fetchJson(new URL('/v1/health?days=7',endpoint),token,fetcher);
 if(typeof health.host_id!=='string'||!health.host_id)throw new Error('Noch kein gebundener Hostnachweis verfügbar.');
 if(!ip&&/^[A-Za-z0-9_.-]+$/.test(settings.ssh_host||'')) {
  const config=execFileSync('ssh',['-G',settings.ssh_host],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
  const candidate=config.match(/^hostname (.+)$/m)?.[1]; if(candidate&&isIP(candidate))ip=candidate;
 }
 if(ip&&!isIP(ip))throw new Error('Anzeige-IP ist ungültig.');
 const file=sourceFile(),expected=existsSync(file)?readFileSync(file,'utf8'):null;
 const source=expected?privateJson(file):{version:1,hosts:[]};validateSources(source);
 const current=source.hosts.find(h=>h.id==='primary');
 if(current&&(current.native_host_id!==health.host_id||current.endpoint!==endpoint||current.token_file!==keyPath))throw new Error('Abweichende vorhandene Hostregistrierung erhalten.');
 if(!current){source.hosts.push({id:'primary',name:health.host_id,native_host_id:health.host_id,ip,endpoint,token_file:keyPath,fresh_seconds:900,bindings:[]});validateSources(source);replace(file,source,expected);}
 return {connected:true,host_count:source.hosts.length,host_identity_bound:true,health_windows:Array.isArray(health.windows)?health.windows.length:0,key_in_browser:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const file=process.argv[2]||resolve(homedir(),'Library/Application Support/Tradegazing Office/Desk/private/mac-desk.json');
 try {console.log(JSON.stringify(await connectFleet(file)));} catch {console.error('Fleet-Verbindung konnte nicht eingerichtet werden. Vorhandene Konfiguration und Zugänge bleiben erhalten; kein Schlüssel wird ausgegeben.');process.exitCode=1;}
}
