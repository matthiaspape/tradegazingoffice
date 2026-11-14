import { demoFleets } from './demo-data';
import type { Overview, Host, Fleet } from './fleet-types';
// Explicitly selected demo only; it is never a fallback for a failed native request.
export function demoOverview(): Overview {
 const asOf='2026-11-14T10:55:00Z';
 const examples=[['100500.00','100840.00','280.00','340.00'],['50000.00','50000.00','-65.00','0.00'],['80120.00','79980.00','-180.00','-140.00']];
 const hosts:Host[]=['atlas','borealis'].map((id,index)=>({
  id,name:index?'Borealis VPS':'Atlas VPS',ip:index?'198.51.100.20':'192.0.2.10',observedAt:asOf,state:'CURRENT',connection:'CURRENT',lastPull:asOf,issue:null,
  cpu:index?78:38,cpuMax:index?86:45,ram:{total:12*1024**3,used:6*1024**3,percent:50},
  volumes:[{name:'C:',total:160*1024**3,used:64*1024**3,percent:40}],samples:20,cpuSamples:20,expected:20,attention:[],waitingForEa:false,unboundAccounts:0,
  series:Array.from({length:12},(_,i)=>({at:new Date(Date.parse(asOf)-(11-i)*300000).toISOString(),cpu:(index?70:30)+i%9,ram:45+i%6,volumes:[{name:'C:',total:160*1024**3,used:(60+i/3)*1024**3,percent:(60+i/3)/160*100}]})),
  processes:[{pid:4120,startedAt:'2026-11-12T07:00:00Z',terminal:'Demo-Terminal',binding:'BOUND',cpu:8.2,workingSet:620*1024**2,privateBytes:510*1024**2}],fleets:[]
 }));
 demoFleets.forEach((source,i)=>{
  const h=hosts[i===2?1:0], values=examples[i], observedAt=i===2?'2026-11-14T10:25:00Z':asOf;
  const f:Fleet={id:source.id,hostId:h.id,name:source.name,broker:i===1?'Beispielbroker B':'Beispielbroker A',deploymentId:`${source.id}-demo`,environment:'DEMO',currency:'EUR',
   observedAt,freshSeconds:900,state:i===2?'STALE':'CURRENT',status:i===0?'Active':i===1?'Inaktive':'Zuletzt Failure',sharedAccount:false,
   balance:values[0],equity:values[1],profitToday:values[2],unrealized:values[3],positionMode:'HEDGING',
   series:Array.from({length:13},(_,n)=>({at:new Date(Date.parse(observedAt)-(12-n)*300000-(n<6&&i===2?300000:0)).toISOString(),value:(Number(values[1])+(n-12)*24+Math.sin(n)*35).toFixed(2)})),
   reasons:i===2?['Letzter Fehlerstatus um 11:25. Aktueller Betrieb unbekannt; Quelle veraltet.']:['Fiktives Beispiel · kein nativer Flottenexport'],
   variants:source.variants.map(v=>({symbol:v.symbol,timeframe:null,pool:v.pool,revision:v.revision,ready:true})),
   pools:source.sample.pools.map(p=>({name:p.name,used:String(p.used),capacity:String(p.capacity)})),positions:[]};
  h.fleets.push(f);
 });
 return {mode:'DEMO',asOf,hosts};
}
