export type Point = {at:string;value:string|null};
export type Volume = {name:string;total:number|null;used:number|null;percent:number|null};
export type Fleet = {
 id:string;hostId:string;name:string;broker:string;deploymentId:string;environment:string;currency:string;
 subtitle?:string;
 observedAt:string|null;freshSeconds:number;state:string;status:string;sharedAccount:boolean;
 balance:string|null;equity:string|null;profitToday:string|null;unrealized:string|null;series:Point[];reasons:string[];positionMode:string;
 variants:{symbol:string;timeframe:number|null;pool:string;revision:string;ready:boolean|null}[];
 pools:{name:string;used:string|null;capacity:string|null}[];
 positions:{symbol:string;id:string;volume:string|null;sl:string|null;tp:string|null}[];
};
export type Host = {
 id:string;name:string;ip:string|null;observedAt:string|null;state:string;connection:string;lastPull:string|null;issue:string|null;
 cpu:number|null;cpuMax:number|null;ram:{total:number|null;used:number|null;percent:number|null};volumes:Volume[];
 samples:number|null;cpuSamples:number|null;expected:number|null;attention:string[];waitingForEa:boolean;unboundAccounts:number;
 series:{at:string;cpu:number|null;ram:number|null;volumes:Volume[]}[];
 processes:{pid:number|null;startedAt:string;terminal:string;binding:string;cpu:number|null;workingSet:number|null;privateBytes:number|null}[];
 fleets:Fleet[];
};
export type Overview = {mode:'NATIVE'|'DEMO';asOf:string;hosts:Host[];refreshing?:boolean};
