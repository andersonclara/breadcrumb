"use client";
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {checkSliceGesture,sliceHint} from '@breadcrumb/shared/loaf';

type Point={x:number;y:number;t:number};
// Loaf box inside the 40×24 viewBox; trace points are normalized to it (0–1) for the server check.
const BOX={x:2,y:4,w:36,h:16};
const crust='#B9692C',body='#D98A36',top='#FFC65A',inside='#FFF5C4';

function LoafHalf({from,to}:{from:number;to:number}){
 // Pixel loaf clipped to [from,to] across its width, in viewBox units.
 const rects=[{x:4,y:4,w:32,h:2,c:top},{x:3,y:6,w:34,h:3,c:body},{x:2,y:9,w:36,h:9,c:body},{x:3,y:18,w:34,h:2,c:crust},{x:7,y:7,w:4,h:1,c:inside},{x:16,y:7,w:5,h:1,c:inside},{x:26,y:7,w:4,h:1,c:inside}];
 return <>{rects.map((r,i)=>{const x1=Math.max(r.x,from),x2=Math.min(r.x+r.w,to);return x2>x1?<rect key={i} x={x1} y={r.y} width={x2-x1} height={r.h} fill={r.c}/>:null;})}<rect x={from===BOX.x?to-0.6:from} y={6} width={0.6} height={13} fill={inside}/></>;
}

// Drag the knife down through the dotted line to split the loaf. The same shared rules decide here and
// on the server (src/lib/auth/loaf.ts), so "Sliced!" only appears for a cut the server will accept.
// resetKey: a new value (e.g. each sign-up attempt's result) bakes a fresh loaf, since challenges are single-use.
export function LoafSlicer({onChange,resetKey}:{onChange:(sliced:boolean)=>void;resetKey?:unknown}){
 const [loaf,setLoaf]=useState<{challenge:string;cut:number}|null>(null),[status,setStatus]=useState<'loading'|'ready'|'sliced'|'missed'|'off'|'error'>('loading'),[hint,setHint]=useState('');
 const [trace,setTrace]=useState<Point[]>([]),[cutAt,setCutAt]=useState(0.5);
 const drawing=useRef<Point[]|null>(null),start=useRef(0),svg=useRef<SVGSVGElement>(null),[nonce,setNonce]=useState(0);
 useEffect(()=>{
  let live=true;
  onChange(false);
  fetch('/api/auth/loaf',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error();return response.json();}).then(data=>{
   if(!live)return;setTrace([]);setHint('');
   if(data.enabled===false){setStatus('off');onChange(true);return;}
   if(typeof data.challenge!=='string'||!Number.isFinite(data.cut))throw new Error();
   setLoaf(data);setStatus('ready');onChange(false);
  }).catch(()=>{if(live)setStatus('error');});
  return ()=>{live=false;};
 },[nonce,resetKey,onChange]);
 const fresh=()=>{setStatus('loading');setTrace([]);setHint('');onChange(false);setNonce(n=>n+1);};
 const point=(e:PointerEvent<SVGSVGElement>):Point=>{const r=svg.current!.getBoundingClientRect();const vx=(e.clientX-r.left)/r.width*40,vy=(e.clientY-r.top)/r.height*24;return {x:(vx-BOX.x)/BOX.w,y:(vy-BOX.y)/BOX.h,t:Math.round(performance.now()-start.current)};};
 function finish(points:Point[]){
  if(!loaf)return;
  const result=checkSliceGesture(loaf.cut,points);
  // A full cut in the wrong spot really splits the loaf there; that loaf is spent until NEW LOAF.
  if(!result.ok&&result.cutAt!==undefined){setCutAt(result.cutAt);setTrace([]);setStatus('missed');setHint(sliceHint(result.reason));return;}
  if(!result.ok){setHint(sliceHint(result.reason));setTrace([]);return;}
  // Split where the knife actually went.
  setCutAt(result.cutAt);setTrace(points);setStatus('sliced');setHint('');onChange(true);
 }
 // Keyboard path: a slow, slightly wobbly cut along the line, for people who can't drag.
 function keyboardSlice(){
  if(!loaf)return;const points:Point[]=[];let t=0;
  for(let i=0;i<=24;i++){t+=40+Math.round(Math.random()*30);points.push({x:loaf.cut+(Math.random()-0.5)*0.03,y:-0.05+i*0.05,t});}
  finish(points);
 }
 if(status==='off')return null;
 const cutDone=status==='sliced'||status==='missed';
 const guideX=loaf?BOX.x+loaf.cut*BOX.w:20,split=cutDone?1.6:0,cutX=cutDone?BOX.x+cutAt*BOX.w:guideX;
 return <div className="loaf-slicer">
  <label>PROVE YOU&apos;RE HUMAN: SLICE THE LOAF</label>
  <svg ref={svg} viewBox="0 0 40 24" shapeRendering="crispEdges" role="img" aria-label={status==='sliced'?'Loaf sliced':status==='missed'?'Loaf cut in the wrong spot':'Loaf to slice: drag down through the dotted line'} style={{touchAction:'none'}}
   onPointerDown={e=>{if(status!=='ready')return;e.currentTarget.setPointerCapture(e.pointerId);start.current=performance.now();drawing.current=[point(e)];}}
   onPointerMove={e=>{const d=drawing.current;if(!d||d.length>=400)return;const p=point(e);if(p.t<=d[d.length-1].t)return;d.push(p);setTrace([...d]);}}
   onPointerUp={()=>{const points=drawing.current;drawing.current=null;if(points)finish(points);}}
   onPointerCancel={()=>{drawing.current=null;setTrace([]);}}>
   <g style={{transform:`translateX(${-split}px)`,transition:'transform .35s'}}><LoafHalf from={BOX.x} to={cutX}/></g>
   <g style={{transform:`translateX(${split}px)`,transition:'transform .35s'}}><LoafHalf from={cutX} to={BOX.x+BOX.w}/></g>
   {(status==='ready'||status==='missed')&&<line x1={guideX} x2={guideX} y1={2} y2={22} stroke="#774D35" strokeWidth={0.4} strokeDasharray="1 1"/>}
   {!cutDone&&trace.length>1&&<polyline fill="none" stroke="#49382C" strokeWidth={0.5} points={trace.map(p=>`${BOX.x+p.x*BOX.w},${BOX.y+p.y*BOX.h}`).join(' ')}/>}
  </svg>
  <input type="hidden" name="loafChallenge" value={status==='sliced'?loaf?.challenge??'':''}/>
  <input type="hidden" name="loafTrace" value={status==='sliced'?JSON.stringify(trace):''}/>
  <p className="auth-copy" aria-live="polite">{status==='loading'?'Baking a fresh loaf…':status==='error'?'Could not load the loaf.':status==='sliced'?'Sliced! You’re human.':hint||'Drag the knife down through the dotted line.'}</p>
  <div className="loaf-actions">{status==='ready'&&<button type="button" className="text-button" onClick={keyboardSlice}>SLICE WITH KEYBOARD</button>}{status!=='loading'&&<button type="button" className="text-button" onClick={fresh}>NEW LOAF</button>}</div>
 </div>;
}
