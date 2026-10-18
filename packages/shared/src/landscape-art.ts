import type {PixelRect} from './pixel';

export function canopyArt(variant=0){
 const pixels:PixelRect[]=[];
 const r=(x:number,y:number,w:number,h:number,color:string)=>pixels.push({x,y,w,h,color});
 const leaf=variant===1?'#488C62':variant===2?'#5B9958':'#488453';
 r(5,27,24,4,'#61744B');r(16,15,3,14,'#78543B');r(18,19,2,9,'#B18A53');
 r(8,4,17,19,leaf);r(3,9,27,11,leaf);r(6,19,20,5,'#3E704C');
 r(9,1,14,4,'#79AD62');r(5,7,16,8,'#79AD62');r(11,3,12,7,'#91BE73');
 r(4,13,7,4,'#659C58');r(25,11,5,9,'#366A4B');r(12,20,10,3,'#4B8050');
 return {width:32,height:32,pixels};
}

// Alachua: four separate yellow beam structures framing the Marston entrance.
export function frenchFriesArt(){
 const pixels:PixelRect[]=[];
 const polygon=(points:number[][],color:string)=>{
  for(let y=Math.min(...points.map(p=>p[1]));y<Math.max(...points.map(p=>p[1]));y++){
   const xs:number[]=[];for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
   xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)pixels.push({x:Math.ceil(xs[i]),y,w:Math.max(1,Math.floor(xs[i+1])-Math.ceil(xs[i])),h:1,color});
  }
 };
 const beam=(ax:number,ay:number,bx:number,by:number,w:number)=>{
  const length=Math.hypot(bx-ax,by-ay),dx=-(by-ay)/length*w/2,dy=(bx-ax)/length*w/2;
  const points=[[ax+dx,ay+dy],[bx+dx,by+dy],[bx-dx,by-dy],[ax-dx,ay-dy]].map(p=>p.map(Math.round));
  polygon(points.map(([x,y])=>[x+2,y+3]),'#CA951A');polygon(points,'#FFD134');
  polygon([points[0],points[1],[points[1][0]+1,points[1][1]+1],[points[0][0]+1,points[0][1]+1]],'#FFF18A');
 };
 polygon([[5,55],[53,51],[62,57],[14,63]],'#87966B');
 beam(11,55,20,7,5);beam(5,22,28,52,5);beam(4,40,27,30,5);
 beam(45,54,34,7,5);beam(35,39,60,16,5);beam(36,26,60,45,5);
 return {width:64,height:64,pixels};
}
