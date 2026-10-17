import type {PixelRect} from './pixel';

type Building={id:string;name:string;width:number;height:number;rise:number};
// Shared architectural sprites, generated once per footprint, for both renderers.
// These are stylized facades rather than surveyed reconstructions of each building.
const cache=new Map<string,{width:number;height:number;pixels:PixelRect[]}>();
export function buildingArt(b:Building){
 const cached=cache.get(b.id);if(cached)return cached;
 const width=96,depth=Math.max(10,Math.min(40,Math.round(b.height/Math.max(b.width,.1)*26)));
 const wall=Math.max(18,Math.min(100,Math.round(b.rise/Math.max(b.width,.1)*96)));
 const height=depth+wall+10,pixels:PixelRect[]=[];
 const r=(x:number,y:number,w:number,h:number,color:string)=>{if(w>0&&h>0)pixels.push({x,y,w,h,color});};
 const polygon=(points:number[][],color:string)=>{
  for(let y=Math.min(...points.map(p=>p[1]));y<Math.max(...points.map(p=>p[1]));y++){
   const xs:number[]=[];for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],c=points[j];if((a[1]>y)!==(c[1]>y))xs.push(a[0]+(y-a[1])*(c[0]-a[0])/(c[1]-a[1]));
   }
   xs.sort((a,c)=>a-c);for(let i=0;i+1<xs.length;i+=2)r(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i]),1,color);
  }
 };
 const hash=[...b.id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 const modern=/hospital|health|medical|dental|cancer|research|engineering|computer|data|science/i.test(b.name);
 const historic=/norman|anderson|peabody|thomas|buckman|sledd|murphree|auditorium|smathers|bryan|flint|keene|dauer/i.test(b.name);
 const garage=/garage|parking/i.test(b.name);
 const colors=modern?['#D8DDD2','#8199A3','#EEF0DF']:historic?['#C67551','#864A3C','#EDCDA0']:hash%3===0?['#D9BD93','#A48369','#FFF0C6']:['#C98460','#8F5945','#F3D6A1'];
 const [wallColor,side,trim]=colors,top=depth+4,bottom=height-5,front=76;
 // Shallow, consistent roof perspective rather than a steep triangular wedge.
 const roofRise=Math.max(2,Math.round(depth*.28));
 // Cast shadow and two visible faces, with a receding roof plane.
 polygon([[5,bottom],[front,bottom],[94,bottom-roofRise],[96,bottom-roofRise+5],[front,height],[5,height]],'#617654');
 r(4,top,front-4,wall,wallColor);
 polygon([[front,top],[92,top-roofRise],[92,bottom-roofRise],[front,bottom]],side);
 polygon([[4,top],[20,top-roofRise],[92,top-roofRise],[front,top]],modern?'#E7EADD':historic?'#BA7453':'#D8BB98');
 r(4,top,72,3,trim);
 polygon([[76,top],[92,top-roofRise],[92,top-roofRise+3],[76,top+3]],trim);
 // Rooftop skylights / mechanical housings, stepped gables on historic halls.
 if(historic){polygon([[22,top],[38,top-6],[54,top]],'#E6C895');r(33,top-3,10,3,'#597D8E');r(6,top-2,4,6,trim);r(69,top-2,4,6,trim);}
 else {const y=top-roofRise*.7;polygon([[29,y],[38,y-2],[57,y-1],[48,y+1]],'#F7EAD0');r(29,y,19,2,'#9BA8A2');r(60,y,9,2,'#8CA6AB');}
 const rows=Math.max(1,Math.min(8,Math.floor((wall-7)/10))),step=(wall-6)/rows;
 for(let row=0;row<rows;row++){
  const y=Math.round(top+5+row*step),wh=Math.max(3,Math.floor(step-4));
  if(garage){r(9,y,62,wh,'#526269');r(8,y+wh,64,2,trim);}
  else for(let x=10;x<70;x+=11){
   r(x-1,y-1,8,wh+2,trim);r(x,y,6,wh,'#446E85');r(x+1,y+1,2,Math.max(1,wh-2),'#9ED6D7');
   if(modern){polygon([[x+7,y-1],[x+10,y+wh+1],[x+7,y+wh+1]],'#F4EDCD');}
   else r(x+3,y,1,wh,'#D6DCC7');
  }
  for(let x=80;x<91;x+=6){const sy=y-(x-76)*roofRise/16;r(x,sy,3,wh,'#395D71');r(x,sy,1,Math.max(1,wh-1),'#7FAEB5');}
  if(!modern)r(5,y+wh+2,70,1,trim);
 }
 // Entrance canopy, double glass doors, masonry plinth and entry steps.
 r(33,bottom-11,15,11,'#344C59');r(35,bottom-9,5,9,'#85BABC');r(41,bottom-9,5,9,'#699BAA');
 r(29,bottom-13,23,3,trim);r(4,bottom-2,72,2,trim);r(30,bottom,21,2,'#DFCBA6');r(27,bottom+2,27,2,'#F5DFB5');
 const art={width,height,pixels};cache.set(b.id,art);return art;
}
