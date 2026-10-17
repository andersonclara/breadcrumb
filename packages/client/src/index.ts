import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {emptyWorld,type World} from '@breadcrumb/shared';
export function useWorld(client:SupabaseClient|null) {
 const [world,setWorld]=useState<World>(emptyWorld),[error,setError]=useState(''),[now,setNow]=useState(0);
 const epoch=useRef(0),request=useRef(0),applied=useRef(0);
 const refresh=useCallback(async()=>{
  if(!client)return;
  const scope=epoch.current,sequence=++request.current;
  try {
   const {data,error:readError}=await client.rpc('pixel_world');
   if(scope!==epoch.current||sequence<applied.current)return;
   if(readError) {setError(readError.code==='PGRST202'?'Apply the pixel-world migration to connect avatars, friends, and breadcrumbs.':'Campus updates are unavailable. Retrying…');return;}
   const next=data as World;
   applied.current=sequence;
   setWorld(previous=>({...next,presence:next.presence.map(p=>{const old=previous.presence.find(o=>o.id===p.id);return {...p,moving:Boolean(old&&(old.latitude!==p.latitude||old.longitude!==p.longitude))};})}));setError('');
  }catch{setError('Campus updates are unavailable. Retrying…');}
  finally{setNow(Date.now());}
 },[client]);
 useEffect(()=>{
  let active=true;
  const load=async()=>{if(active)await refresh();};
  void load(); const interval=setInterval(()=>{void load();},5000);
  const {data:listener}=client?.auth.onAuthStateChange(event=>{epoch.current++;if(event==='SIGNED_OUT')setWorld(emptyWorld);void Promise.resolve().then(load);})??{data:null};
  return()=>{active=false;clearInterval(interval);listener?.subscription.unsubscribe();};
 },[client,refresh]);
 return {world:{...world,presence:world.presence.filter(p=>Date.parse(p.expires_at)>now)},error,refresh};
}
