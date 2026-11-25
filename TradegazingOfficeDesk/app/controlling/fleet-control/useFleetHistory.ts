'use client';
import { useEffect, useState } from 'react';
import { BROWSER_POLL_MS } from '../../../ops/fleet-timing.mjs';
import type { Host, Point } from './fleet-types';

type HealthPoint=Host['series'][number];
type Reply = {
  cursor:string; reset:boolean;
  equity:[string,number,Point|null][];
  health:[number,HealthPoint|null][];
};
type History = { cursor:string; equity:Map<string,Map<number,Point>>; health:Map<number,HealthPoint>; failed:boolean };
const blank=():History=>({cursor:'',equity:new Map(),health:new Map(),failed:false});

function change<T>(map:Map<number,T>,slot:number,value:T|null) {
  if(value===null)map.delete(slot);
  else map.set(slot,value);
}

export function applyHistory(previous:History, reply:Reply):History {
  const equity=reply.reset?new Map():new Map([...previous.equity].map(([key,points])=>[key,new Map(points)]));
  const health=reply.reset?new Map():new Map(previous.health);
  for(const [id,slot,point] of reply.equity) {
    const series=equity.get(id)??new Map<number,Point>();
    change(series,slot,point);
    if(series.size) equity.set(id,series);
    else equity.delete(id);
  }
  for(const [slot,point] of reply.health) change(health,slot,point);
  return {cursor:reply.cursor,equity,health,failed:false};
}

export function useFleetHistory(serialHosts:string, hours:number) {
  const key=JSON.stringify([serialHosts,hours]);
  const [snapshot,setSnapshot]=useState<{key:string;hosts:Map<string,History>}>();
  useEffect(()=>{
    if(!serialHosts)return;
    const ids=serialHosts.split(',').map(host=>host.split(':')[0]);
    const hosts=new Map(ids.map(id=>[id,blank()]));
    const controller=new AbortController();
    let pending=false;
    const refresh=async()=>{
      if(pending||controller.signal.aborted)return;
      pending=true;
      await Promise.all(ids.map(async id=>{
        const previous=hosts.get(id)!;
        const query=new URLSearchParams({host:id,hours:String(hours)});
        if(previous.cursor)query.set('after',previous.cursor);
        try {
          const response=await fetch('/api/fleet-control/history?'+query,{cache:'no-store',signal:controller.signal});
          if(!response.ok)throw new Error('History unavailable');
          const reply:Reply=await response.json();
          if(!controller.signal.aborted)hosts.set(id,applyHistory(previous,reply));
        } catch {
          if(!controller.signal.aborted)hosts.set(id,{...previous,failed:true});
        }
        if(!controller.signal.aborted)setSnapshot({key,hosts:new Map(hosts)});
      }));
      pending=false;
    };
    const resume=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',resume);
    void refresh();
    const interval=setInterval(refresh,BROWSER_POLL_MS);
    return ()=>{controller.abort();clearInterval(interval);document.removeEventListener('visibilitychange',resume);};
  },[key,serialHosts,hours]);
  return snapshot?.key===key?snapshot.hosts:undefined;
}
