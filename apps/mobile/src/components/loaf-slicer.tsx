import {useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,Text,View,type GestureResponderEvent,type LayoutChangeEvent} from 'react-native';
import Svg,{G,Line,Polyline,Rect} from 'react-native-svg';
import {checkSliceGesture,sliceHint} from '@breadcrumb/shared';
import {apiFetch} from '@/lib/api';
import {gameStyles as s} from '@/components/game-ui';

export type LoafSlice={challenge:string;trace:{x:number;y:number;t:number}[]};
type Point={x:number;y:number;t:number};
// Same geometry as the web slicer: loaf box inside a 40×24 viewBox, trace normalized to that box.
const BOX={x:2,y:4,w:36,h:16};
const RECTS=[{x:4,y:4,w:32,h:2,c:'#FFC65A'},{x:3,y:6,w:34,h:3,c:'#D98A36'},{x:2,y:9,w:36,h:9,c:'#D98A36'},{x:3,y:18,w:34,h:2,c:'#B9692C'},{x:7,y:7,w:4,h:1,c:'#FFF5C4'},{x:16,y:7,w:5,h:1,c:'#FFF5C4'},{x:26,y:7,w:4,h:1,c:'#FFF5C4'}];
function Half({from,to}:{from:number;to:number}){
 return <>{RECTS.map((r,i)=>{const x1=Math.max(r.x,from),x2=Math.min(r.x+r.w,to);return x2>x1?<Rect key={i} x={x1} y={r.y} width={x2-x1} height={r.h} fill={r.c}/>:null;})}</>;
}

// Drag a finger down through the dotted line. The server re-checks the gesture before Auth0 sign-up.
export function LoafSlicer({onChange,resetKey}:{onChange:(slice:LoafSlice|null)=>void;resetKey?:unknown}){
 const [loaf,setLoaf]=useState<{challenge:string;cut:number}|null>(null),[status,setStatus]=useState<'loading'|'ready'|'sliced'|'missed'|'off'|'error'>('loading'),[trace,setTrace]=useState<Point[]>([]),[hint,setHint]=useState('');
 const size=useRef({w:1,h:1}),drawing=useRef<Point[]|null>(null),start=useRef(0),current=useRef(loaf);
 useEffect(()=>{current.current=loaf;},[loaf]);
 const [nonce,setNonce]=useState(0),[cutAt,setCutAt]=useState(0.5);
 useEffect(()=>{
  let live=true;
  apiFetch('/api/auth/loaf').then(response=>response.json()).then(data=>{
   if(!live)return;setTrace([]);setHint('');onChange(null);
   if(data.enabled===false){setStatus('off');return;}
   setLoaf(data);setStatus('ready');
  }).catch(()=>{if(live)setStatus('error');});
  return ()=>{live=false;};
 },[nonce,resetKey,onChange]);
 const fresh=()=>{setStatus('loading');setTrace([]);setHint('');onChange(null);setNonce(n=>n+1);};
 const finish=useCallback((points:Point[])=>{
  const l=current.current;if(!l)return;
  // Same shared rules as the server, so "Sliced!" only appears for a cut it will accept.
  const result=checkSliceGesture(l.cut,points);
  // A full cut in the wrong spot really splits the loaf there; that loaf is spent until NEW LOAF.
  if(!result.ok&&result.cutAt!==undefined){setCutAt(result.cutAt);setTrace([]);setStatus('missed');setHint(sliceHint(result.reason));return;}
  if(!result.ok){setHint(sliceHint(result.reason));setTrace([]);return;}
  setCutAt(result.cutAt);setTrace(points);setStatus('sliced');setHint('');onChange({challenge:l.challenge,trace:points});
 },[onChange]);
 // Touch handlers (React Native's responder system); they run on touch events, not during render.
 const toPoint=(e:GestureResponderEvent):Point=>({x:(e.nativeEvent.locationX/size.current.w*40-BOX.x)/BOX.w,y:(e.nativeEvent.locationY/size.current.h*24-BOX.y)/BOX.h,t:Date.now()-start.current});
 const touch=status!=='ready'?{}:{
  onStartShouldSetResponder:()=>true,onMoveShouldSetResponder:()=>true,onResponderTerminationRequest:()=>false,
  onResponderGrant:(e:GestureResponderEvent)=>{start.current=Date.now();drawing.current=[toPoint(e)];},
  onResponderMove:(e:GestureResponderEvent)=>{const d=drawing.current;if(!d||d.length>=400)return;const p=toPoint(e);if(p.t>d[d.length-1].t){d.push(p);setTrace([...d]);}},
  onResponderRelease:()=>{const d=drawing.current;drawing.current=null;if(d)finish(d);},
  onResponderTerminate:()=>{drawing.current=null;setTrace([]);},
 };
 if(status==='off')return null;
 const cutDone=status==='sliced'||status==='missed';
 const guideX=loaf?BOX.x+loaf.cut*BOX.w:20,split=cutDone?1.6:0,cutX=cutDone?BOX.x+cutAt*BOX.w:guideX;
 return <View style={{gap:6}}>
  <Text style={s.label}>PROVE YOU&apos;RE HUMAN: SLICE THE LOAF</Text>
  <View accessibilityLabel={status==='sliced'?'Loaf sliced':status==='missed'?'Loaf cut in the wrong spot':'Loaf to slice: drag down through the dotted line'} onLayout={(e:LayoutChangeEvent)=>{size.current={w:e.nativeEvent.layout.width,h:e.nativeEvent.layout.height};}} style={{width:'100%',aspectRatio:40/24,borderWidth:2,borderStyle:'dashed',borderColor:'#D8B67F',backgroundColor:'#FFFDF5'}} {...touch}>
   <Svg width="100%" height="100%" viewBox="0 0 40 24" pointerEvents="none">
    <G x={-split}><Half from={BOX.x} to={cutX}/></G><G x={split}><Half from={cutX} to={BOX.x+BOX.w}/></G>
    {(status==='ready'||status==='missed')&&<Line x1={guideX} x2={guideX} y1={2} y2={22} stroke="#774D35" strokeWidth={0.4} strokeDasharray="1 1"/>}
    {!cutDone&&trace.length>1&&<Polyline fill="none" stroke="#49382C" strokeWidth={0.5} points={trace.map(p=>`${BOX.x+p.x*BOX.w},${BOX.y+p.y*BOX.h}`).join(' ')}/>}
   </Svg>
  </View>
  <Text style={s.body} accessibilityLiveRegion="polite">{status==='loading'?'Baking a fresh loaf…':status==='error'?'Could not load the loaf.':status==='sliced'?'Sliced! You’re human.':hint||'Drag your finger down through the dotted line.'}</Text>
  {status!=='loading'&&<Pressable onPress={fresh}><Text style={s.label}>NEW LOAF</Text></Pressable>}
 </View>;
}
