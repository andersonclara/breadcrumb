"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {inCampus,roundedLocation,type Coordinate} from '@breadcrumb/shared';
import {worldAction,worldClient} from '@/lib/world-client';

const Context=createContext<{sharing:boolean;starting:boolean;position:Coordinate|null;error:string;start:()=>Promise<void>;stop:()=>void}|null>(null);
export function LocationSharingProvider({children}:{children:ReactNode}){
 const [sharing,setSharing]=useState(false),[starting,setStarting]=useState(false),[position,setPosition]=useState<Coordinate|null>(null),[error,setError]=useState('');
 const watch=useRef<number|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),current=useRef<Coordinate|null>(null),generation=useRef(0);
 const stop=useCallback(()=>{
  generation.current++;
  if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);
  watch.current=null;if(timer.current)clearInterval(timer.current);timer.current=null;current.current=null;
  setSharing(false);setStarting(false);setPosition(null);
  void worldAction('presence_stop').catch(()=>{});
 },[]);
 useEffect(()=>{
  const ticketRef=generation;
  const visibility=()=>{if(document.hidden)stop();};
  document.addEventListener('visibilitychange',visibility);
  const auth=worldClient?.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')stop();});
  return()=>{document.removeEventListener('visibilitychange',visibility);auth?.data.subscription.unsubscribe();ticketRef.current++;
   if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);if(timer.current)clearInterval(timer.current);
   if(watch.current!==null)void fetch('/api/world',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'presence_stop',data:{}}),keepalive:true}).catch(()=>{});
  };
 },[stop]);
 async function start(){
  if(watch.current!==null||starting)return;
  if(!navigator.geolocation){setError('Location is unavailable in this browser.');return;}
  const ticket=++generation.current;setStarting(true);setError('');
  const {data}=await worldClient?.auth.getUser()??{data:{user:null}};
  if(ticket!==generation.current)return;
  if(!data.user){setError('Sign in to share your location.');setStarting(false);return;}
  const publish=()=>{if(current.current)void worldAction('presence',roundedLocation(current.current)).catch(e=>{if(ticket!==generation.current)return;setError(e instanceof Error?e.message:'Could not share location.');stop();});};
  watch.current=navigator.geolocation.watchPosition(fix=>{
   if(ticket!==generation.current)return;
   const p={latitude:fix.coords.latitude,longitude:fix.coords.longitude};
   if(!inCampus(p)){setError('You are outside the UF campus map.');stop();return;}
   current.current=p;setPosition(p);setStarting(false);setSharing(true);publish();
  },()=>{if(ticket!==generation.current)return;setError('Location permission was denied or your position could not be found.');stop();},{enableHighAccuracy:false,maximumAge:15000,timeout:15000});
  timer.current=setInterval(publish,20000);
 }
 return <Context.Provider value={{sharing,starting,position,error,start,stop}}>{children}</Context.Provider>;
}
export function useLocationSharing(){const value=useContext(Context);if(!value)throw new Error('LocationSharingProvider required');return value;}
export function LocationSettings(){
 const {sharing,starting,error,start,stop}=useLocationSharing();
 return <section id="location" className="friend-sharing"><p className="pixel-kicker">YOUR LOCATION</p><h2>Explore with your crew</h2><p>Only accepted friends can see your avatar location, rounded to about 100 meters. Sharing starts off and stops when you leave the app or hide this tab.</p><button type="button" role="switch" aria-checked={sharing||starting} aria-label="Share location with friends" className="pixel-button" onClick={()=>sharing||starting?stop():void start()}>{starting?'FINDING YOU / CANCEL':sharing?'ON / FRIENDS CAN FIND YOU':'OFF / LOCATION PRIVATE'}</button>{error&&<p role="status">{error}</p>}</section>;
}
