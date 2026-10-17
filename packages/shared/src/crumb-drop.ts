import {toastPixels} from './landmarks';
import {breadPixels,type PixelRect} from './pixel';

export const CRUMB_DROP_DURATION=1350;
export function loafTearPixels(frame=0):PixelRect[]{
 return toastPixels(frame);
}

export function crumbDropPixels(elapsed:number,source?:{x:number;y:number}):(PixelRect&{opacity:number})[]{
 const t=Math.max(0,elapsed);if(t>=CRUMB_DROP_DURATION)return [];
 const pixels:(PixelRect&{opacity:number})[]=[];
 const add=(p:PixelRect,opacity=1)=>pixels.push({...p,opacity});
 if(t<1100){
  const scale=source?1:1.8,ox=source?source.x-16:-48,oy=source?source.y-16:-112;
  for(const p of toastPixels(t<180?0:3).filter(p=>t<180||p.x<=24))add({...p,x:ox+p.x*scale,y:oy+p.y*scale,w:p.w*scale,h:p.h*scale},Math.min(1,(1100-t)/300));
 }
 if(t>=220){
  const progress=Math.min(1,(t-220)/730),bounce=t>950&&t<1150?-10*Math.sin((t-950)/200*Math.PI):0;
  const x=(source?source.x+8:-8)*(1-progress),y=source?(source.y-8)*(1-progress*progress)-(source.y>-20?112:0)*progress*(1-progress)+bounce:-96*(1-progress*progress)+bounce;
  add({x:-8,y:1,w:16,h:3,color:'#73563D'},.15+.2*progress);
  for(const p of breadPixels('crumb'))add({...p,color:p.color==='#D98A36'?'#C78532':p.color,x:x+(p.x-8)*2.4,y:y+(p.y-13)*2.4,w:p.w*2.4,h:p.h*2.4},Math.min(1,(CRUMB_DROP_DURATION-t)/160));
 }
 if(t>=950){
  const progress=(t-950)/400,r=6+progress*20;
  for(const [x,y] of [[-r,-3],[r,-3],[-r*.6,-r*.6],[r*.6,-r*.6]])add({x,y,w:3,h:3,color:'#FFC65A'},1-progress);
 }
 return pixels;
}
