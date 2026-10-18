// Sutherland-Hodgman clipping removes the overlapping vector-tile buffers.
export function clipRing(ring,box){
 let points=ring.slice(0,-1);
 for(const [axis,edge,above] of [[0,box[0],true],[0,box[2],false],[1,box[1],true],[1,box[3],false]]){
  const input=points;points=[];if(!input.length)break;
  const inside=p=>above?p[axis]>=edge:p[axis]<=edge;
  for(let i=0;i<input.length;i++){
   const a=input[(i+input.length-1)%input.length],b=input[i],ai=inside(a),bi=inside(b);
   if(ai!==bi){const t=(edge-a[axis])/(b[axis]-a[axis]);points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
   if(bi)points.push(b);
  }
 }
 return points.length>=3?[...points,points[0]]:[];
}
export function buildGroundSurfaces(data,bounds){
 const project=([lon,lat])=>[+((lon-bounds.west)/(bounds.east-bounds.west)*320).toFixed(4),+((bounds.north-lat)/(bounds.north-bounds.south)*320).toFixed(4)];
 const order={'Landscape Base':0,Fields:1,'Roads and Parking Lots':2,'Paths and Courtyards':3,'Steps and Ramps':4};
 return data.features.flatMap(f=>{
  const box=[Math.max(f.clip[0],bounds.west),Math.max(f.clip[1],bounds.south),Math.min(f.clip[2],bounds.east),Math.min(f.clip[3],bounds.north)];
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  return polygons.flatMap((polygon,i)=>{
   const rings=polygon.map(r=>clipRing(r,box).map(project));if(!rings[0].length)return [];
   const points=rings.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
   return [{id:`${f.id}-${i}`,material:f.material,order:order[f.layer]??0,left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys),path:rings.filter(r=>r.length).map(r=>r.slice(0,-1).map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')+'Z').join('')}];
  });
 }).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
}
