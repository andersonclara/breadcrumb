import {campus,toWorld,fromWorld,type Coordinate} from './world';
export type NearbyPostBuilding={id:string;name:string;distance:number;point:Coordinate};
export function nearbyPostBuildings(origin:Coordinate,maxDistance=150):NearbyPostBuilding[]{
 const p=toWorld(origin);
 return campus.buildings.filter(b=>b.name&&!/^(campus building|unnamed)/i.test(b.name)).map(b=>{
  const dx=Math.max(0,Math.abs(p.x-b.x)-b.width/2),dy=Math.max(0,b.y-b.height-p.y,p.y-b.y);
  return {id:b.id,name:b.name,distance:Math.hypot(dx,dy)*campus.metersPerUnit,point:fromWorld(b.x,b.y-b.height/2)};
 }).filter(b=>b.distance<=maxDistance).sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name)).slice(0,12);
}
export function postLocation(origin:Coordinate|null,buildings:NearbyPostBuilding[],buildingId:string):Coordinate|null{
 return buildings.find(b=>b.id===buildingId)?.point??origin;
}
export function describePostLocation(origin:Coordinate,buildings:NearbyPostBuilding[]=nearbyPostBuildings(origin)):string{
 const nearest=buildings[0],p=toWorld(origin),tolerance=6/campus.metersPerUnit;
 const onPath=campus.walkways.some(route=>route.points.some((b,i)=>{
  if(!i)return false;const a=route.points[i-1],dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy)<=tolerance;
 }));
 // A footprint match means "at", rather than assuming the user is indoors.
 if(nearest?.distance===0)return `At ${nearest.name}`;
 if(nearest){const relation=nearest.distance<=25?'outside':'near';return `${onPath?'Path '+relation:relation[0].toUpperCase()+relation.slice(1)} ${nearest.name}`;}
 return onPath?'Campus path':'Campus map spot';
}
