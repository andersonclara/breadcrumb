"use client";
import {useEffect,useState} from 'react';
import {avatarPixels,breadPixels,toastPixels,defaultAvatar,type AvatarConfig,type WorldCrumb} from '@breadcrumb/shared';
export function ToastLogo({size=36}:{size?:number}){
 const [frame,setFrame]=useState(0);
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;let t=0;const timer=setInterval(()=>{t=(t+1)%40;setFrame(t<30?0:t-30);},100);return()=>clearInterval(timer);},[]);
 return <svg viewBox="0 0 36 36" width={size} height={size} shapeRendering="crispEdges" aria-label="Breadcrumb toast logo">{toastPixels(frame).map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}/>)}</svg>;
}
export function AvatarArt({avatar=defaultAvatar,walking=false,size=64}:{avatar?:AvatarConfig;walking?:boolean;size?:number}) {
 return <svg viewBox="0 0 16 24" width={size} height={size*1.5} shapeRendering="crispEdges" aria-label="Pixel avatar" className={walking?'avatar-walking':''}>
  {[0,1].map(frame=><g key={frame} className={`avatar-frame-${frame}`}>{avatarPixels(avatar,frame).map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</g>)}
 </svg>;
}
export function BreadArt({state='crumb',size=32}:{state?:WorldCrumb['state'];size?:number}) {
 return <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-label={state.replace('_',' ')}>{breadPixels(state).map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</svg>;
}
