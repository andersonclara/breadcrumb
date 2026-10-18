const materials=['unknown','grass','brick','concrete'];
function ringsFromPath(path,rise=0){
 return path.split('M').slice(1).map(r=>[...r.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m=>[Number(m[1]),Number(m[2])+rise]));
}
// Fill polygon interiors using even/odd parity, preserving courtyards and holes.
function raster(rings,size,visit){
 const scale=size/320,points=rings.flat();if(!points.length)return;
 const top=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))*scale)),bottom=Math.min(size-1,Math.ceil(Math.max(...points.map(p=>p[1]))*scale));
 for(let row=top;row<=bottom;row++){
  const y=(row+.5)/scale,xs=[];
  for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y))xs.push((a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))*scale);
  }
  xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2)for(let x=Math.max(0,Math.ceil(xs[i]-.5));x<Math.min(size,Math.ceil(xs[i+1]-.5));x++)visit(x,row);
 }
}
function nearestGround(surfaces,size,maxDistance){
 const count=size*size,known=new Uint8Array(count),nearest=new Uint8Array(count),distance=new Uint8Array(count).fill(255),queue=new Int32Array(count);
 for(const surface of surfaces){
  const value=materials.indexOf(surface.material);
  raster(ringsFromPath(surface.path),size,(x,y)=>{known[y*size+x]=value>0?value:surface.material==='unknown'?0:4;});
 }
 let head=0,tail=0;
 for(let i=0;i<count;i++)if(known[i]>0&&known[i]<4){nearest[i]=known[i];distance[i]=0;queue[tail++]=i;}
 // Nearby surface continuation only; distant building interiors default to path.
 while(head<tail){const i=queue[head++],d=distance[i]+1;if(d>maxDistance)continue;
  for(const j of [i%size?i-1:-1,i%size<size-1?i+1:-1,i-size,i+size])if(j>=0&&j<count&&distance[j]===255){distance[j]=d;nearest[j]=nearest[i];queue[tail++]=j;}
 }
 return {known,nearest};
}
export function inferSurroundingGround(surfaces,size=1280){
 const {known,nearest}=nearestGround(surfaces,size,2),step=320/size,groups=new Map();
 // Extend nearby paved edges at most ~6m; all remaining unknown land stays green.
 for(let y=0;y<size;y++)for(let x=0;x<size;){
  const i=y*size+x,material=!known[i]?nearest[i]:0;
  if(material!==2&&material!==3){x++;continue;}
  const chunkX=Math.floor(x/32),chunkY=Math.floor(y/32),start=x;
  while(x<size&&Math.floor(x/32)===chunkX&&!known[y*size+x]&&nearest[y*size+x]===material)x++;
  const id=`surrounding-${chunkX}-${chunkY}-${material}`;
  const group=groups.get(id)??{id,material:materials[material],inferred:true,order:-2,left:chunkX*32*step,right:(chunkX+1)*32*step,top:chunkY*32*step,bottom:(chunkY+1)*32*step,path:''};
  group.path+=`M${start*step} ${y*step}h${(x-start)*step}v${step}H${start*step}z`;groups.set(id,group);
 }
 return [...groups.values()];
}
export function inferBuildingGround(surfaces,buildings,size=2560){
 const {known,nearest}=nearestGround(surfaces,size,24),step=320/size,result=[];
 for(const b of buildings){
  const cells=[[],[],[],[]];
  raster(ringsFromPath(b.path,b.rise),size,(x,y)=>{const i=y*size+x;if(!known[i])cells[nearest[i]||3].push([x,y]);});
  for(let material=1;material<=3;material++){
   const points=cells[material];if(!points.length)continue;
   let path='';for(let i=0;i<points.length;){const [x,y]=points[i];let end=x+1;i++;while(i<points.length&&points[i][1]===y&&points[i][0]===end){end++;i++;}path+=`M${x*step} ${y*step}h${(end-x)*step}v${step}H${x*step}z`;}
   result.push({id:`infill-${b.id}-${material}`,material:materials[material],order:-1,inferred:true,left:b.x-b.width/2,right:b.x+b.width/2,top:b.y-b.height,bottom:b.y,path});
  }
 }
 return result;
}
