"use client";
import {useEffect,useState} from 'react';
import {loafTearPixels,breadPixels} from '@breadcrumb/shared';
export function ToastCrumbButton({onPick,compact=false,disabled=false}:{onPick:()=>void;compact?:boolean;disabled?:boolean}){
 const [frame,setFrame]=useState(0),[tearing,setTearing]=useState(false);
 useEffect(()=>{if(!tearing)return;let step=0;const timer=setInterval(()=>{step++;setFrame(Math.min(step,9));if(step===9)onPick();if(step>=10){clearInterval(timer);setFrame(0);setTearing(false);}},85);return()=>clearInterval(timer);},[tearing,onPick]);
 return <button className={`toast-crumb-button ${compact?'compact':''}`} aria-label="Tear a crumb from the loaf and place it on the map" disabled={disabled||tearing} onClick={()=>setTearing(true)}><svg viewBox="0 0 36 36" shapeRendering="crispEdges" aria-hidden="true">{loafTearPixels(frame).map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}/>)}</svg><span>{tearing?'TAKE A CRUMB…':compact?'DROP CRUMB':'LEAVE A CRUMB'}</span></button>;
}
export function CarriedCrumb({active}:{active:boolean}){
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 useEffect(()=>{if(!active)return;const move=(e:PointerEvent)=>{if(e.pointerType==='mouse')setPoint({x:e.clientX,y:e.clientY});};window.addEventListener('pointermove',move);return()=>window.removeEventListener('pointermove',move);},[active]);
 if(!active||!point)return null;
 return <svg className="carried-crumb" viewBox="0 0 16 16" width="34" height="34" style={{left:point.x+9,top:point.y-8}} aria-hidden="true">{breadPixels('crumb').map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}/>)}</svg>;
}
