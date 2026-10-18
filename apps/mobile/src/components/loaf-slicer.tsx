import {useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,Text,View,type GestureResponderEvent,type LayoutChangeEvent} from 'react-native';
import Svg,{G,Line,Polyline,Rect} from 'react-native-svg';
import {checkSliceGesture,sliceHint} from '@breadcrumb/shared';
import {apiFetch} from '@/lib/api';
import {gameStyles as s} from '@/components/game-ui';
import {theme} from '@/lib/theme';

export type LoafSlice={challenge:string;trace:{x:number;y:number;t:number}[]};
type Point={x:number;y:number;t:number};
// Same geometry as the web slicer: loaf box inside a 40×24 viewBox, trace normalized to that box.
const BOX={x:2,y:4,w:36,h:16};
const RECTS=[{x:4,y:4,w:32,h:2,c:'#FFC65A'},{x:3,y:6,w:34,h:3,c:'#D98A36'},{x:2,y:9,w:36,h:9,c:'#D98A36'},{x:3,y:18,w:34,h:2,c:'#B9692C'},{x:7,y:7,w:4,h:1,c:'#FFF5C4'},{x:16,y:7,w:5,h:1,c:'#FFF5C4'},{x:26,y:7,w:4,h:1,c:'#FFF5C4'}];
function Half({from,to}:{from:number;to:number}){
 return <>{RECTS.map((r,i)=>{const x1=Math.max(r.x,from),x2=Math.min(r.x+r.w,to);return x2>x1?<Rect key={i} x={x1} y={r.y} width={x2-x1} height={r.h} fill={r.c}/>:null;})}</>;
}

// Drag a finger down through the dotted line. The server re-checks the gesture before Auth0 sign-up.
export function LoafSlicer({onChange,onReady,onInteractionChange,resetKey}:{onChange:(slice:LoafSlice|null)=>void;onReady:(ready:boolean)=>void;onInteractionChange:(active:boolean)=>void;resetKey?:unknown}){
 const [loaf,setLoaf]=useState<{challenge:string;cut:number}|null>(null),[status,setStatus]=useState<'loading'|'ready'|'sliced'|'missed'|'off'|'error'>('loading'),[trace,setTrace]=useState<Point[]>([]),[hint,setHint]=useState('');
 const size=useRef({w:1,h:1}),drawing=useRef<Point[]|null>(null),start=useRef(0),current=useRef(loaf);
 useEffect(()=>{current.current=loaf;},[loaf]);
 // Release the page even if navigation or a challenge reset interrupts the cut.
 useEffect(()=>()=>{onInteractionChange(false);},[onInteractionChange]);
 const [nonce,setNonce]=useState(0),[cutAt,setCutAt]=useState(0.5);
 useEffect(()=>{
  let live=true;
  drawing.current=null;onInteractionChange(false);
  onChange(null);onReady(false);
  apiFetch('/api/auth/loaf').then(response=>{if(!response.ok)throw new Error();return response.json();}).then(data=>{
   if(!live)return;setTrace([]);setHint('');onChange(null);
   if(data.enabled===false)throw new Error('Account creation is temporarily unavailable. Please retry.');
   if(typeof data.challenge!=='string'||!Number.isFinite(data.cut))throw new Error();
   setLoaf(data);setStatus('ready');
  }).catch(e=>{if(live){setHint(e instanceof Error&&e.message?e.message:'Could not load the bread challenge. Please retry.');setStatus('error');}});
  return ()=>{live=false;};
 },[nonce,resetKey,onChange,onReady,onInteractionChange]);
 const fresh=()=>{setStatus('loading');setTrace([]);setHint('');onChange(null);onReady(false);setNonce(n=>n+1);};
 const finish=useCallback((points:Point[])=>{
  const l=current.current;if(!l)return;
  // Same shared rules as the server, so "Sliced!" only appears for a cut it will accept.
  const result=checkSliceGesture(l.cut,points);
  // A full cut in the wrong spot really splits the loaf there; that loaf is spent until NEW LOAF.
  if(!result.ok&&result.cutAt!==undefined){setCutAt(result.cutAt);setTrace([]);setStatus('missed');setHint(sliceHint(result.reason));return;}
  if(!result.ok){setHint(sliceHint(result.reason));setTrace([]);return;}
  setCutAt(result.cutAt);setTrace(points);setStatus('sliced');setHint('');onChange({challenge:l.challenge,trace:points});onReady(true);
 },[onChange,onReady]);
 const assistedSlice=()=>{
  const l=current.current;if(!l)return;
  let elapsed=0;
  finish(Array.from({length:25},(_,i)=>{elapsed+=40+Math.round(Math.random()*30);return {x:l.cut+(Math.random()-0.5)*0.03,y:-0.05+i*0.05,t:elapsed};}));
 };
 // Touch handlers (React Native's responder system); they run on touch events, not during render.
 const toPoint=(e:GestureResponderEvent):Point=>({x:(e.nativeEvent.locationX/size.current.w*40-BOX.x)/BOX.w,y:(e.nativeEvent.locationY/size.current.h*24-BOX.y)/BOX.h,t:Date.now()-start.current});
 const touch=status!=='ready'?{}:{
  onStartShouldSetResponderCapture:()=>true,onStartShouldSetResponder:()=>true,onMoveShouldSetResponder:()=>true,onResponderTerminationRequest:()=>false,
  onResponderGrant:(e:GestureResponderEvent)=>{onInteractionChange(true);start.current=Date.now();drawing.current=[toPoint(e)];},
  onResponderMove:(e:GestureResponderEvent)=>{const d=drawing.current;if(!d||d.length>=400)return;const p=toPoint(e);if(p.t>d[d.length-1].t){d.push(p);setTrace([...d]);}},
  onResponderRelease:()=>{const d=drawing.current;drawing.current=null;onInteractionChange(false);if(d)finish(d);},
  onResponderTerminate:()=>{drawing.current=null;setTrace([]);onInteractionChange(false);},
 };
 if(status==='off')return null;
 const cutDone=status==='sliced'||status==='missed';
 const guideX=loaf?BOX.x+loaf.cut*BOX.w:20,split=cutDone?1.6:0,cutX=cutDone?BOX.x+cutAt*BOX.w:guideX;
 return <View style={{gap:10}}>
  <Text style={{fontFamily:'PressStart2P_400Regular',fontSize:10,lineHeight:18,color:theme.ink}}>ONE LAST SLICE</Text>
  <View accessibilityLabel={status==='sliced'?'Loaf sliced':status==='missed'?'Loaf cut in the wrong spot':'Loaf to slice: drag down through the dotted line'} onLayout={(e:LayoutChangeEvent)=>{size.current={w:e.nativeEvent.layout.width,h:e.nativeEvent.layout.height};}} style={{width:'100%',aspectRatio:40/24,borderWidth:2,borderStyle:'dashed',borderRadius:6,borderColor:'#C39458',backgroundColor:theme.surface}} {...touch}>
   <Svg width="100%" height="100%" viewBox="0 0 40 24" pointerEvents="none">
    <G x={-split}><Half from={BOX.x} to={cutX}/></G><G x={split}><Half from={cutX} to={BOX.x+BOX.w}/></G>
    {(status==='ready'||status==='missed')&&<Line x1={guideX} x2={guideX} y1={2} y2={22} stroke="#774D35" strokeWidth={0.4} strokeDasharray="1 1"/>}
    {!cutDone&&trace.length>1&&<Polyline fill="none" stroke="#49382C" strokeWidth={0.5} points={trace.map(p=>`${BOX.x+p.x*BOX.w},${BOX.y+p.y*BOX.h}`).join(' ')}/>}
   </Svg>
  </View>
  <Text style={{fontSize:14,lineHeight:21,color:status==='error'?theme.danger:status==='sliced'?theme.success:theme.muted}} accessibilityLiveRegion="polite">{status==='loading'?'Warming up your loaf...':status==='error'?hint:status==='sliced'?'Sliced! You’re human.':hint||'Slice down the dotted line to prove you’re human.'}</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8}}>
   {status==='ready'&&<Pressable accessibilityRole="button" accessibilityLabel="Slice loaf without dragging" onPress={assistedSlice} style={{minHeight:48,justifyContent:'center'}}><Text style={[s.label,{fontSize:13,textDecorationLine:'underline'}]}>Slice without dragging</Text></Pressable>}
   {status!=='loading'&&<Pressable accessibilityRole="button" onPress={fresh} style={{minHeight:48,justifyContent:'center'}}><Text style={[s.label,{fontSize:13,textDecorationLine:'underline'}]}>{status==='error'?'Retry bread challenge':'New loaf'}</Text></Pressable>}
  </View>
 </View>;
}
