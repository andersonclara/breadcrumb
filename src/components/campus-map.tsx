"use client";
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {campus,toWorld,fromWorld,inCampus,toastPixels,previewWalk,campusScene,visibleWalkways,avatarWorldScale,pinchCamera,type Coordinate,type World,type WorldCrumb} from '@breadcrumb/shared';
import {AvatarArt,BreadArt} from './pixel-art';
type Props={world:World;onDrop:(p:Coordinate)=>void;onCrumb:(c:WorldCrumb)=>void;selected?:Coordinate|null;ownPosition?:Coordinate|null;dropEffect?:{id:number;point:Coordinate}|null};
export function CampusMap({world,onDrop,onCrumb,selected,ownPosition,dropEffect}:Props){
 const [zoom,setZoom]=useState(24),[manualCenter,setCenter]=useState<{x:number;y:number;facing?:number}>(previewWalk(0,0)),[follow,setFollow]=useState(true);
 const preview=true;const [seconds,setSeconds]=useState(0);
 const effect=dropEffect;
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setSeconds(t=>t+.15),150);return()=>clearInterval(timer);},[]);
 const center=follow&&preview?previewWalk(0,seconds):manualCenter,span=320/zoom;
 const scene=campusScene(world,preview,seconds,ownPosition,center,span);
 const [viewport,setViewport]=useState(640);
 const svg=useRef<SVGSVGElement>(null),drag=useRef<{x:number;y:number;center:{x:number;y:number};moved:boolean}|null>(null);
 useEffect(()=>{if(!svg.current)return;const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setViewport(Math.max(r.width,r.height,1));});observer.observe(svg.current);return()=>observer.disconnect();},[]);
 const safari=useRef<{zoom:number;anchor:{x:number;y:number};active:boolean}>({zoom:1,anchor:{x:0,y:0},active:false});
 const touches=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef<{distance:number;zoom:number;anchor:{x:number;y:number}}|null>(null),pinched=useRef(false);
 function local(x:number,y:number){const r=svg.current!.getBoundingClientRect();return {x:x-r.left,y:y-r.top};}
 function anchorAt(x:number,y:number){const p=local(x,y),r=svg.current!.getBoundingClientRect(),scale=span/Math.max(r.width,r.height);return {x:center.x+(p.x-r.width/2)*scale,y:center.y+(p.y-r.height/2)*scale};}
 useEffect(()=>{
  const node=svg.current;if(!node)return;
  function apply(nextZoom:number,x:number,y:number,anchor?:{x:number;y:number}){const r=node!.getBoundingClientRect(),midpoint={x:x-r.left,y:y-r.top},scale=320/zoom/Math.max(r.width,r.height);const fixed=anchor??{x:center.x+(midpoint.x-r.width/2)*scale,y:center.y+(midpoint.y-r.height/2)*scale};const next=pinchCamera(zoom,zoom,nextZoom,fixed,midpoint,r);setFollow(false);setZoom(next.zoom);setCenter(next.center);}
  const wheel=(e:WheelEvent)=>{if(!e.ctrlKey||safari.current.active)return;e.preventDefault();apply(zoom*Math.exp(-e.deltaY*.012),e.clientX,e.clientY);};
  const start=(event:Event)=>{const e=event as Event&{clientX:number;clientY:number};e.preventDefault();safari.current.zoom=zoom;safari.current.active=true;const r=node.getBoundingClientRect(),scale=320/zoom/Math.max(r.width,r.height);safari.current.anchor={x:center.x+(e.clientX-r.left-r.width/2)*scale,y:center.y+(e.clientY-r.top-r.height/2)*scale};};
  const change=(event:Event)=>{const e=event as Event&{scale:number;clientX:number;clientY:number};e.preventDefault();apply(safari.current.zoom*e.scale,e.clientX,e.clientY,safari.current.anchor);};
  const end=()=>{safari.current.active=false;};
  node.addEventListener('wheel',wheel,{passive:false});node.addEventListener('gesturestart',start,{passive:false});node.addEventListener('gesturechange',change,{passive:false});node.addEventListener('gestureend',end);
  return()=>{node.removeEventListener('wheel',wheel);node.removeEventListener('gesturestart',start);node.removeEventListener('gesturechange',change);node.removeEventListener('gestureend',end);};
 },[zoom,center,span]);
 const playerScale=Math.max(avatarWorldScale,44*span/viewport/24);
 function down(e:PointerEvent<SVGSVGElement>){if(e.button!==0)return;
 if(e.pointerType==='touch'){touches.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.current.size>=2){const [a,b]=[...touches.current.values()];pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom,anchor:anchorAt((a.x+b.x)/2,(a.y+b.y)/2)};pinched.current=true;drag.current=null;e.currentTarget.setPointerCapture(e.pointerId);return;}pinched.current=false;}
 setFollow(false);setCenter(center);drag.current={x:e.clientX,y:e.clientY,center,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}
 function move(e:PointerEvent<SVGSVGElement>){
 if(touches.current.has(e.pointerId))touches.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch.current&&touches.current.size>=2){const [a,b]=[...touches.current.values()],r=e.currentTarget.getBoundingClientRect();const next=pinchCamera(pinch.current.zoom,pinch.current.distance,Math.hypot(a.x-b.x,a.y-b.y),pinch.current.anchor,local((a.x+b.x)/2,(a.y+b.y)/2),r);setFollow(false);setZoom(next.zoom);setCenter(next.center);return;}
 const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>5)d.moved=true;const scale=span/Math.max(e.currentTarget.clientWidth,e.currentTarget.clientHeight);setCenter({x:Math.max(0,Math.min(320,d.center.x-dx*scale)),y:Math.max(0,Math.min(320,d.center.y-dy*scale))});}
 function up(e:PointerEvent<SVGSVGElement>){touches.current.delete(e.pointerId);if(pinched.current){if(!touches.current.size){pinched.current=false;pinch.current=null;}drag.current=null;return;}const d=drag.current;drag.current=null;if(d&&!d.moved&&svg.current){const p=svg.current.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const matrix=svg.current.getScreenCTM();if(matrix){const w=p.matrixTransform(matrix.inverse()),coord=fromWorld(w.x,w.y);if(inCampus(coord))onDrop(coord);}}}

 return <div className="pixel-map">
 <svg ref={svg} className="campus-world" viewBox={`${center.x-span/2} ${center.y-span/2} ${span} ${span}`} preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;pinch.current=null;touches.current.clear();pinched.current=false;}} aria-label="UF campus with raised buildings and life-size avatars following footpaths">
  <rect x="-400" y="-400" width="1200" height="1200" fill={campus.colors[0]}/>
  {campus.paths.map((d,i)=>d?<path key={i} d={d} fill={campus.colors[i]}/>:null)}
  {campus.roads.map(r=><path key={r.id} d={r.path} fill="none" stroke="#C4B594" strokeWidth={r.width} strokeLinecap="round" strokeLinejoin="round"/>)}
  {visibleWalkways(center,span).map(p=><path key={p.id} d={p.path} fill="none" stroke="#FFE7B1" strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round"/>)}
  {scene.map(o=>o.kind==='building'?(o.art?<g key={'b'+o.id} transform={`translate(${o.x-o.width/2} ${o.y-o.artHeight}) scale(${o.width/o.art.width} ${o.artHeight/o.art.height})`}><title>{o.name}</title>{o.art.pixels.map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</g>:<g key={'b'+o.id}><title>{o.name||'Campus building'}</title><path d={o.path} transform={`translate(.12 ${o.rise+.12})`} fill="#506C46" fillRule="evenodd" opacity=".3"/>{o.faces.map((face,i)=><path key={i} d={face.path} fill={face.color}/>)}<path d={o.accents} fill="#F4DDA8"/><path d={o.windows} fill="#4A8EAF"/><path d={o.path} fill={o.roof} fillRule="evenodd" stroke={o.landmark?"#FFE9AE":"#E7CFAC"} strokeWidth={o.landmark?.045:.025}/></g>):<g key={o.id} transform={`translate(${o.x} ${o.y})`}><ellipse rx={playerScale*6} ry={playerScale*1.5} fill="#506B47" opacity=".45"/><g transform={`scale(${o.facing} 1) translate(${-8*playerScale} ${-24*playerScale})`}><AvatarArt avatar={o.avatar} walking={o.walking} size={16*playerScale}/></g>{zoom>=16&&<text y={-24*playerScale-1/zoom} fontSize={2/zoom} textAnchor="middle" fill="#49382C" stroke="#FFF5D9" strokeWidth={.4/zoom} paintOrder="stroke">{o.label}</text>}</g>)}
  {scene.filter(o=>o.kind==='building'&&o.landmark&&zoom>=8).map(o=>o.kind==='building'&&<g key={'label'+o.id} transform={`translate(${o.x} ${o.y-(o.art?o.artHeight:o.height+o.rise)-8*span/viewport})`} pointerEvents="none"><text textAnchor="middle" fontSize={11*span/viewport} fontWeight="bold" fill="#49382C" stroke="#FFF0C9" strokeWidth={4*span/viewport} paintOrder="stroke">{o.name.replace('J. Wayne ','').replace('Ben Hill Griffin Stadium','THE SWAMP').toUpperCase()}</text><path d={`M${-3*span/viewport} ${3*span/viewport}h${6*span/viewport}l${-3*span/viewport} ${4*span/viewport}z`} fill="#D9A347"/></g>)}
  {campus.labels.filter(l=>zoom>=8&&Math.abs(l.x-center.x)<span/2&&Math.abs(l.y-center.y)<span/2).map(label=><text key={label.name} x={label.x} y={label.y+.5} fontSize={4/zoom} textAnchor="middle" fill="#4E3B31" stroke="#FAEDCF" strokeWidth={.6/zoom} paintOrder="stroke" className="map-label">{label.name.toUpperCase()}</text>)}
  {world.crumbs.map(c=>{const p=toWorld(c);return <g key={c.id} transform={`translate(${p.x-8/zoom} ${p.y-16/zoom})`} role="button" tabIndex={0} aria-label={c.title} onPointerDown={e=>e.stopPropagation()} onClick={()=>onCrumb(c)} onKeyDown={e=>{if(e.key==='Enter')onCrumb(c);}}><BreadArt state={c.state} size={16/zoom}/></g>;})}
  {selected&&(()=>{const p=toWorld(selected);return <path d="M-.08 0h.16M0-.08v.16" transform={`translate(${p.x} ${p.y})`} stroke="#B44F3F" strokeWidth=".02"/>;})()}
  {effect&&<MapDrop key={effect.id} point={effect.point} zoom={zoom}/>}
 </svg>
 <div className="map-top-label">UF OVERWORLD <span className="map-sub">/ {Math.round(span*campus.metersPerUnit)} M VIEW</span></div>
 <div className="map-controls"><button aria-label="Zoom in" onClick={()=>setZoom(Math.min(128,zoom*1.5))}>+</button><button aria-label="Zoom out" onClick={()=>setZoom(Math.max(1,zoom/1.5))}>-</button></div>

 <div className="map-help">PINCH TO ZOOM / DRAG TO ROAM / TAP TO DROP</div><a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors / ODbL</a>
 </div>;
}
function MapDrop({point,zoom}:{point:Coordinate;zoom:number}){
 const [frame,setFrame]=useState(5);useEffect(()=>{let n=5;const timer=setInterval(()=>{n++;setFrame(n);if(n>=10)clearInterval(timer);},100);return()=>clearInterval(timer);},[]);
 if(frame>=10)return null;const p=toWorld(point);return <g transform={`translate(${p.x-12/zoom} ${p.y-20/zoom}) scale(${.8/zoom})`} pointerEvents="none">{toastPixels(frame).map((r,i)=><rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}/>)}</g>;
}
