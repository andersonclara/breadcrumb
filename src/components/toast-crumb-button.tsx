"use client";
import {useEffect,useState} from 'react';
import {toastPixels,breadPixels} from '@breadcrumb/shared';
export function ToastCrumbButton({onPick,compact=false,disabled=false}:{onPick:()=>void;compact?:boolean;disabled?:boolean}){
 const [frame,setFrame]=useState(0),[tearing,setTearing]=useState(false);
 useEffect(()=>{if(!tearing)return;let step=0;const timer=setInterval(()=>{step++;setFrame(Math.min(step,4));if(step===3)onPick();if(step>=8){clearInterval(timer);setFrame(0);setTearing(false);}},85);return()=>clearInterval(timer);},[tearing,onPick]);
 return <button className={`toast-crumb-button ${compact?'compact':''}`} aria-label="Tear a crumb from the toast and place it on the map" disabled={disabled||tearing} onClick={()=>setTearing(true)}><svg viewBox="0 0 36 36" shapeRendering="crispEdges" aria-hidden="true">{toastPixels(frame).map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}/>)}</svg><span>{tearing?'TAKE A CRUMB…':compact?'DROP CRUMB':'TAKE A CRUMB & DROP IT'}</span></button>;
}
export function CarriedCrumb({active}:{active:boolean}){
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 useEffect(()=>{if(!active)return;const move=(e:PointerEvent)=>{if(e.pointerType==='mouse')setPoint({x:e.clientX,y:e.clientY});};window.addEventListener('pointermove',move);return()=>window.removeEventListener('pointermove',move);},[active]);
 if(!active||!point)return null;
 return <svg className="carried-crumb" viewBox="0 0 16 16" width="34" height="34" style={{left:point.x+9,top:point.y-8}} aria-hidden="true">{breadPixels('crumb').map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}/>)}</svg>;
}
