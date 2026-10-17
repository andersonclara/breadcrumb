import {useEffect,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View,type GestureResponderEvent} from 'react-native';
import Svg,{Defs,Pattern,G,Path,Rect,Text as SvgText} from 'react-native-svg';
import {campus,toWorld,fromWorld,inCampus,crumbDropPixels,CRUMB_DROP_DURATION,previewWalk,campusScene,visibleWalkways,avatarWorldScale,groundMaterials,groundMaterial,visibleGround,hitBuildingSprite,type MapBuilding,type Coordinate,type World,type WorldCrumb} from '@breadcrumb/shared';
import {pinchCamera} from '@/lib/map-gesture';
import {AvatarGlyph,BreadGlyph} from './pixel-art';
type Props={communityName?:string;onBuilding?:(b:MapBuilding)=>void;selectedBuildingId?:string|null;placing?:boolean;world:World;onDrop:(p:Coordinate)=>void;onCrumb:(c:WorldCrumb)=>void;selected?:Coordinate|null;ownPosition?:Coordinate|null;dropEffect?:{id:number;point:Coordinate}|null};
export function CampusMap({communityName='Campus',onBuilding,selectedBuildingId,world,onDrop,onCrumb,selected,ownPosition,dropEffect}:Props){
 const [zoom,setZoom]=useState(24),[manualCenter,setCenter]=useState<{x:number;y:number}>(previewWalk(0,0)),[follow,setFollow]=useState(true),[size,setSize]=useState({width:320,height:500});
 const preview=true;const [tick,setTick]=useState(0);
 const effect=dropEffect;
 useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),225);return()=>clearInterval(t);},[]);
 const buildingTap=useRef<{id:string;time:number}|null>(null),buildingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(buildingTimer.current)clearTimeout(buildingTimer.current);},[]);
 const ref=useRef<View>(null),origin=useRef({x:0,y:0,pageX:0,pageY:0});
 const offset=useRef({left:0,top:0}),didMove=useRef(false),pinch=useRef<{distance:number;zoom:number;anchor:{x:number;y:number}}|null>(null);
 const center=follow&&preview?previewWalk(0,tick*.225):manualCenter;
 const span=320/zoom,scene=campusScene(world,preview,tick*.225,ownPosition,center,span);
 const playerScale=Math.max(avatarWorldScale,44*span/Math.max(size.width,size.height)/24);
 const scale=320/zoom/Math.max(size.width,size.height);
 function beginPinch(event:GestureResponderEvent){
  if(buildingTimer.current)clearTimeout(buildingTimer.current);buildingTap.current=null;
  const [a,b]=event.nativeEvent.touches;if(!a||!b)return;
  const midpoint={x:(a.pageX+b.pageX)/2-offset.current.left,y:(a.pageY+b.pageY)/2-offset.current.top};
  pinch.current={distance:Math.max(1,Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY)),zoom,anchor:{x:center.x+(midpoint.x-size.width/2)*scale,y:center.y+(midpoint.y-size.height/2)*scale}};
  didMove.current=true;setFollow(false);
 }
 function grant(event:GestureResponderEvent){setFollow(false);setCenter(center);didMove.current=false;pinch.current=null;origin.current={...center,pageX:event.nativeEvent.pageX,pageY:event.nativeEvent.pageY};if(event.nativeEvent.touches.length>=2)beginPinch(event);}
 function move(event:GestureResponderEvent){
  const touches=event.nativeEvent.touches;
  if(touches.length>=2){
   if(!pinch.current){beginPinch(event);return;}
   const [a,b]=touches,midpoint={x:(a.pageX+b.pageX)/2-offset.current.left,y:(a.pageY+b.pageY)/2-offset.current.top};
   const next=pinchCamera(pinch.current.zoom,pinch.current.distance,Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY),pinch.current.anchor,midpoint,size);
   setZoom(next.zoom);setCenter(next.center);return;
  }
  if(pinch.current){pinch.current=null;origin.current={...center,pageX:event.nativeEvent.pageX,pageY:event.nativeEvent.pageY};return;}
  const dx=event.nativeEvent.pageX-origin.current.pageX,dy=event.nativeEvent.pageY-origin.current.pageY;
  if(Math.abs(dx)+Math.abs(dy)>5){didMove.current=true;if(buildingTimer.current)clearTimeout(buildingTimer.current);buildingTap.current=null;setCenter({x:Math.max(0,Math.min(320,origin.current.x-dx*scale)),y:Math.max(0,Math.min(320,origin.current.y-dy*scale))});}
 }
 function release(event:GestureResponderEvent){
   if(didMove.current||pinch.current){pinch.current=null;return;}
   const dx=event.nativeEvent.pageX-origin.current.pageX,dy=event.nativeEvent.pageY-origin.current.pageY;
   if(Math.abs(dx)+Math.abs(dy)>5)return;
   const px=event.nativeEvent.pageX,py=event.nativeEvent.pageY;
   ref.current?.measureInWindow((left,top)=>{
    const x=center.x+(px-left-size.width/2)*scale,y=center.y+(py-top-size.height/2)*scale;
    const crumb=world.crumbs.find(c=>{const p=toWorld(c);return Math.hypot(p.x-x,p.y-8/zoom-y)<10/zoom;});
    if(crumb){onCrumb(crumb);return;}{const hit=hitBuildingSprite({x,y},scene.filter(o=>o.kind==='building'));const b=hit&&campus.buildings.find(b=>b.id===hit.id);if(hit&&b){const now=Date.now(),previous=buildingTap.current;if(buildingTimer.current)clearTimeout(buildingTimer.current);if(previous?.id===b.id&&now-previous.time<=400){buildingTap.current=null;onDrop(fromWorld(b.x,b.y-b.height/2));return;}buildingTap.current={id:b.id,time:now};buildingTimer.current=setTimeout(()=>{buildingTap.current=null;const nextSpan=Math.max(6,hit.width*2.3,hit.artHeight*1.8);setZoom(Math.max(1,Math.min(128,320/nextSpan)));setFollow(false);setCenter({x:hit.x,y:hit.y-hit.artHeight/2});onBuilding?.(b);},400);return;}}if(buildingTimer.current)clearTimeout(buildingTimer.current);buildingTap.current=null;const p=fromWorld(x,y);if(inCampus(p))onDrop(p);
   });
 }
 return <View style={styles.container} ref={ref} onLayout={e=>{setSize(e.nativeEvent.layout);ref.current?.measureInWindow((left,top)=>{offset.current={left,top};});}}>
  <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={()=>true} onResponderGrant={grant} onTouchStart={e=>{if(e.nativeEvent.touches.length>=2)beginPinch(e);}} onResponderTerminate={()=>{pinch.current=null;didMove.current=true;}} onResponderMove={move} onResponderRelease={release}>
   <Svg width="100%" height="100%" viewBox={`${center.x-size.width*scale/2} ${center.y-size.height*scale/2} ${size.width*scale} ${size.height*scale}`}>
    <Defs>{Object.entries(groundMaterials).map(([id,m])=><Pattern key={id} id={`ground-${id}`} width={m.size} height={m.size} patternUnits="userSpaceOnUse"><Rect width={m.size} height={m.size} fill={m.color}/><Path d={m.path} fill={m.detail}/></Pattern>)}</Defs>
    <Rect x="-400" y="-400" width="1200" height="1200" fill={campus.colors[0]}/>
    {campus.paths.map((d,i)=>d?<Path key={i} d={d} fill={campus.colors[i]}/>:null)}
    {campus.roads.map(r=><Path key={r.id} d={r.path} fill="none" stroke="#C4B594" strokeWidth={r.width} strokeLinecap="round" strokeLinejoin="round"/>)}
    {visibleWalkways(center,span).map(p=><Path key={p.id} d={p.path} fill="none" stroke="#FFE7B1" strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round"/>)}
    {visibleGround(center,span).map(surface=><Path key={surface.id} d={surface.path} fill={zoom>=8?`url(#ground-${surface.material in groundMaterials?surface.material:'unknown'})`:groundMaterial(surface.material).color} fillRule="evenodd"/>)}
    {selectedBuildingId&&(()=>{const b=campus.buildings.find(b=>b.id===selectedBuildingId);return b?<Path d={b.path} transform={`translate(0 ${b.rise})`} fill="#FFE47644" stroke="#FFE476" strokeWidth={3*scale} fillRule="evenodd"/>:null;})()}
    {scene.map(o=>o.kind==='building'?(o.art?<G key={'b'+o.id} x={o.x-o.width/2} y={o.y-o.artHeight} scaleX={o.width/o.art.width} scaleY={o.artHeight/o.art.height}>{o.art.pixels.map((p,i)=><Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</G>:<G key={'b'+o.id}>{o.faces.map((face,i)=><Path key={i} d={face.path} fill={face.color}/>)}<Path d={o.accents} fill="#F4DDA8"/><Path d={o.windows} fill="#4A8EAF"/><Path d={o.path} fill={o.roof} fillRule="evenodd" stroke={o.landmark?"#FFE9AE":"#E7CFAC"} strokeWidth={o.landmark?.045:.025}/></G>):<G key={o.id} x={o.x} y={o.y}><G scale={playerScale}><G scaleX={o.facing}><G x={-8} y={-24}><AvatarGlyph avatar={o.avatar} walking={o.walking}/></G></G></G>{zoom>=16&&<SvgText y={-24*playerScale-1/zoom} fontSize={2/zoom} textAnchor="middle" fill="#49382C">{o.label}</SvgText>}</G>)}
    {effect&&<MapDrop key={effect.id} point={effect.point} pixelScale={scale}/>}
    {scene.filter(o=>o.kind==='building'&&o.name!=='Woodland canopy'&&!!o.name&&zoom>=(o.landmark?8:16)).map(o=>o.kind==='building'&&<SvgText key={'label'+o.id} x={o.x} y={o.y-(o.art?o.artHeight:o.height+o.rise)-.15} fontSize={11*span/Math.max(size.width,size.height)} textAnchor="middle" fontWeight="bold" fill="#49382C" stroke="#FFF0C9" strokeWidth={.4/zoom}>{o.name}</SvgText>)}
    {campus.labels.filter(l=>zoom>=16&&Math.abs(l.x-center.x)<span/2&&Math.abs(l.y-center.y)<span/2).map(label=><SvgText key={label.name} x={label.x} y={label.y+.5} fontSize={10*span/Math.max(size.width,size.height)} textAnchor="middle" fill="#49382C" stroke="#FFF2D8" strokeWidth={.6/zoom}>{label.name}</SvgText>)}
    {world.crumbs.map(c=>{const p=toWorld(c);return <G key={c.id} x={p.x-8/zoom} y={p.y-16/zoom} scale={1/zoom}><BreadGlyph state={c.state}/></G>;})}
    {selected&&(()=>{const p=toWorld(selected);return <G x={p.x} y={p.y}><Path d="M-.08 0h.16M0-.08v.16" stroke="#B44F3F" strokeWidth={.02}/></G>;})()}

   </Svg>
  </View>
  <View style={styles.label} pointerEvents="none"><Text style={[styles.labelText,{fontSize:5,color:'#927046',marginBottom:7}]}>UNIVERSITY OF FLORIDA</Text><Text style={styles.labelText}>CAMPUS CRUMBS</Text><Text style={{fontSize:10,color:'#8C704C',marginTop:6}}>{communityName} / {world.crumbs.length} on the map</Text></View>
  <View style={styles.controls}>{[['+',.5],['−',-.5]].map(([label,delta])=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label==='+'?'Zoom in':'Zoom out'} onPress={()=>setZoom(Math.max(1,Math.min(128,zoom*(Number(delta)>0?1.5:1/1.5))))} style={styles.control}><Text style={styles.controlText}>{label}</Text></Pressable>)}</View>

  <Text style={styles.help} pointerEvents="none">PINCH TO ZOOM / DRAG TO ROAM · TAP TO DROP</Text>
  <Text style={styles.attribution}>© UF GIS + OpenStreetMap · ODbL</Text>
 </View>;
}
const styles=StyleSheet.create({previewControls:{position:"absolute",left:10,bottom:70,gap:6},previewButton:{padding:9,backgroundColor:"#FFF3D4",borderWidth:2,borderColor:"#774D35"},previewText:{fontSize:6,fontFamily:"PressStart2P_400Regular",color:"#49382C"},container:{flex:1,backgroundColor:'#A5D879',overflow:'hidden'},label:{position:'absolute',left:12,top:12,padding:12,borderWidth:2,borderColor:'#49382C',backgroundColor:'#FFF3CE',maxWidth:'75%'},labelText:{fontFamily:'PressStart2P_400Regular',fontSize:8,color:'#49382C'},controls:{position:'absolute',right:12,top:12,gap:8},control:{width:36,height:36,backgroundColor:'#FFF2D8',borderWidth:2,borderColor:'#49382C',alignItems:'center',justifyContent:'center'},controlText:{fontSize:24,color:'#49382C'},help:{position:'absolute',bottom:32,alignSelf:'center',backgroundColor:'#FFF2D8',padding:8,fontSize:10,color:'#49382C'},attribution:{position:'absolute',bottom:3,right:5,backgroundColor:'#FFF2D8CC',fontSize:9,color:'#49382C'}});

function MapDrop({point,pixelScale}:{point:Coordinate;pixelScale:number}){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const start=Date.now();const timer=setInterval(()=>{const time=Date.now()-start;setElapsed(time);if(time>=CRUMB_DROP_DURATION)clearInterval(timer);},33);return()=>clearInterval(timer);},[]);
 const p=toWorld(point);return <G x={p.x} y={p.y} scale={pixelScale}>{crumbDropPixels(elapsed).map((r,i)=><Rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} opacity={r.opacity}/>)}</G>;
}
