import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startFleetHarness} from './fleet-browser-harness.mjs';

test('parallel harnesses survive occupied default port and close independently',async()=>{
 const marker=randomUUID();
 const occupant=createServer((_request,response)=>response.end(marker));
 const servers=[];let ownOccupant=false;
 try{
  try{
   await new Promise((done,reject)=>{
    occupant.once('error',reject);
    occupant.listen(5173,'127.0.0.1',done);
   });
   ownOccupant=true;
  }catch(error){if(error.code!=='EADDRINUSE')throw error;}
  // Keep 5173 occupied throughout startup; do not probe then release a candidate port.
  const starts=await Promise.allSettled([startFleetHarness(),startFleetHarness('retry')]);
  for(const result of starts)if(result.status==='fulfilled')servers.push(result.value);
  const failed=starts.filter(result=>result.status==='rejected');
  assert.equal(failed.length,0,failed.map(result=>String(result.reason)).join('\n'));
  const ports=servers.map(server=>Number(new URL(server.url).port));
  assert.equal(new Set(ports).size,2,'Concurrent harnesses must own different ports');
  assert.ok(ports.every(port=>port>0&&port!==5173));
  for(const server of servers){
   const response=await fetch(server.url,{signal:AbortSignal.timeout(10000)});
   assert.equal(response.status,200);
   assert.match(await response.text(),/Isolierter Fleet-Control-Test/);
  }
  await servers[0].close();
  assert.equal((await fetch(servers[1].url,{signal:AbortSignal.timeout(10000)})).status,200,'Closing one harness preserves the other');
  if(ownOccupant){
   const response=await fetch('http://127.0.0.1:5173/',{signal:AbortSignal.timeout(10000)});
   assert.equal(await response.text(),marker,'The original port owner remains untouched');
  }
  const output=resolve(process.env.FLEET_HARNESS_REPORT||fileURLToPath(new URL('../work/fleet-harness-port.json',import.meta.url)));
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify({checked_at:new Date().toISOString(),occupied_start_port:5173,own_occupant:ownOccupant,concurrent_ports:ports,independent_close:true},null,2)+'\n');
 }finally{
  await Promise.all(servers.map(server=>server.close()));
  if(ownOccupant)await new Promise((done,reject)=>occupant.close(error=>error?reject(error):done()));
 }
});
