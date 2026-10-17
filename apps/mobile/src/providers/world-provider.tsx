import {createContext,useContext,useEffect,useRef,useState,useCallback,type PropsWithChildren} from 'react';
import {AppState} from 'react-native';
import * as Location from 'expo-location';
import {useWorld} from '@breadcrumb/client';
import {emptyWorld,inCampus,roundedLocation,type Coordinate,type World} from '@breadcrumb/shared';
import {supabase} from '@/lib/supabase';
import {worldAction} from '@/lib/world';
const Context=createContext<{world:World;error:string;notice:string;pending:boolean;sharing:boolean;position:Coordinate|null;act:(action:string,data?:unknown)=>Promise<unknown>;share:()=>Promise<void>;stop:()=>void}>({world:emptyWorld,error:'',notice:'',pending:false,sharing:false,position:null,act:async()=>{},share:async()=>{},stop:()=>{}});
export function WorldProvider({children}:PropsWithChildren){
 const {world,error,refresh}=useWorld(supabase);
 const [notice,setNotice]=useState(''),[pending,setPending]=useState(false),[sharing,setSharing]=useState(false),[position,setPosition]=useState<Coordinate|null>(null);
 const watcher=useRef<Location.LocationSubscription|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),current=useRef<Coordinate|null>(null),generation=useRef(0);
 function stop(){generation.current++;watcher.current?.remove();watcher.current=null;if(timer.current)clearInterval(timer.current);timer.current=null;setSharing(false);return worldAction('presence_stop').then(()=>{}).catch(()=>{});}
 const invalidate=useCallback(()=>{generation.current+=1;},[]);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='background'){invalidate();watcher.current?.remove();watcher.current=null;if(timer.current)clearInterval(timer.current);timer.current=null;setSharing(false);void worldAction('presence_stop').catch(()=>{});}});return()=>{listener.remove();invalidate();watcher.current?.remove();if(timer.current)clearInterval(timer.current);void worldAction('presence_stop').catch(()=>{});};},[invalidate]);
 async function act(action:string,data:unknown={}){setPending(true);try{const result=await worldAction(action,data);setNotice(result.grouped?'Your related post joined this breadcrumb. You count once toward the loaf.':'Saved!');await refresh();return result;}catch(e){setNotice(e instanceof Error?e.message:'Could not save.');throw e;}finally{setPending(false);}}
 async function share(){
  if(watcher.current||timer.current)return;
  if(!world.profile?.avatar_completed){setNotice('Create and save your avatar before sharing.');return;}
  const ticket=++generation.current;
  const permission=await Location.requestForegroundPermissionsAsync();
  if(permission.status!=='granted'){setNotice('Location permission was not granted. Sharing remains off.');return;}
  if(ticket!==generation.current||AppState.currentState==='background')return;
  const publish=()=>{if(current.current)void worldAction('presence',roundedLocation(current.current)).catch(e=>{setNotice(e.message);stop();});};
  try{
   const subscription=await Location.watchPositionAsync({accuracy:Location.Accuracy.Balanced,timeInterval:10000,distanceInterval:10},location=>{
    if(ticket!==generation.current)return;
    const point={latitude:location.coords.latitude,longitude:location.coords.longitude};
    if(!inCampus(point)){setNotice('You are outside the UF campus map. Sharing was stopped.');stop();return;}
    current.current=point;setPosition(point);setSharing(true);publish();
   });
   if(ticket!==generation.current){subscription.remove();return;}watcher.current=subscription;timer.current=setInterval(publish,20000);
  }catch{setNotice('Could not find your location. Sharing remains off.');stop();}
 }
 return <Context.Provider value={{world,error,notice,pending,sharing,position,act,share,stop}}>{children}</Context.Provider>;
}
export function useCampus(){return useContext(Context);}
