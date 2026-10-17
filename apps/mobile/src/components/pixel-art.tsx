import {useEffect,useState} from 'react';
import Svg,{G,Rect} from 'react-native-svg';
import {avatarPixels,breadPixels,toastPixels,defaultAvatar,type AvatarConfig,type WorldCrumb} from '@breadcrumb/shared';
export function AvatarGlyph({avatar=defaultAvatar,walking=false}:{avatar?:AvatarConfig;walking?:boolean}){
 const [frame,setFrame]=useState(0);
 useEffect(()=>{if(!walking)return;const t=setInterval(()=>setFrame(f=>1-f),225);return()=>clearInterval(t);},[walking]);
 return <G>{avatarPixels(avatar,walking?frame:0).map((p,i)=><Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</G>;
}
export function PixelAvatar({avatar=defaultAvatar,size=64}:{avatar?:AvatarConfig;size?:number}){return <Svg width={size} height={size*1.5} viewBox="0 0 16 24" accessibilityLabel="Pixel avatar"><AvatarGlyph avatar={avatar}/></Svg>;}
export function BreadGlyph({state='crumb'}:{state?:WorldCrumb['state']}){return <G>{breadPixels(state).map((p,i)=><Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</G>;}
export function PixelBread({state='crumb',size=32}:{state?:WorldCrumb['state'];size?:number}){return <Svg width={size} height={size} viewBox="0 0 16 16"><BreadGlyph state={state}/></Svg>;}

export function ToastGlyph({once=false}:{once?:boolean}){
 const [frame,setFrame]=useState(once?5:0);
 useEffect(()=>{let n=once?5:0;const timer=setInterval(()=>{n++;if(once){setFrame(n);if(n>=10)clearInterval(timer);}else{const t=n%40;setFrame(t<30?0:t-30);}},100);return()=>clearInterval(timer);},[once]);
 return <G>{frame<10&&toastPixels(frame).map((r,i)=><Rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}/>)}</G>;
}
export function ToastLogo({size=36}:{size?:number}){return <Svg width={size} height={size} viewBox="0 0 36 36" accessibilityLabel="Breadcrumb toast logo"><ToastGlyph/></Svg>;}
