import {useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import Svg,{Rect} from 'react-native-svg';
import {toastPixels} from '@breadcrumb/shared';
export function ToastCrumbButton({onPick}:{onPick:()=>void}){
 const [frame,setFrame]=useState(0),[tearing,setTearing]=useState(false);
 useEffect(()=>{if(!tearing)return;let step=0;const t=setInterval(()=>{step++;setFrame(Math.min(step,4));if(step>=7){clearInterval(t);setTearing(false);setFrame(0);onPick();}},85);return()=>clearInterval(t);},[tearing,onPick]);
 return <Pressable accessibilityRole="button" accessibilityLabel="Take a crumb from the toast and drop it on the map" disabled={tearing} onPress={()=>setTearing(true)} style={{alignSelf:'center',alignItems:'center',marginTop:-8}}><Svg width={82} height={72} viewBox="0 0 36 36">{toastPixels(frame).map((p,i)=><Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</Svg><View style={{backgroundColor:'#FFF0BD',borderWidth:2,borderColor:'#A06734',paddingHorizontal:10,paddingVertical:5,marginTop:-10}}><Text style={{fontFamily:'PressStart2P_400Regular',fontSize:6,color:'#543420'}}>{tearing?'TAKING A CRUMB…':'TAKE A CRUMB & DROP IT'}</Text></View></Pressable>;
}
