import {campus,toWorld,fromWorld,inCampus,type Coordinate,type World} from './world';
import {defaultAvatar,type AvatarConfig} from './pixel';
import {identifyLandmark,campusLandmarkSprites} from './campus-landmarks';
import {buildingArt} from './building-art';
import {canopyArt,frenchFriesArt} from './landscape-art';
import {previewAvatars} from './landmarks';
const illustratedBuildings=campus.buildings.map(b=>{
  const id=identifyLandmark(b.name),tower=id==='century',emphasis=id==='malachowsky'?1.35:id==='west'||id==='marston'?1.25:1;
  const art=id?campusLandmarkSprites[id]:buildingArt(b);
  // Landmark emphasis preserves the geographic anchors.
  const artHeight=tower?(47.85/campus.metersPerUnit+b.height)*2:Math.max(b.height+b.rise,b.width*.3)*emphasis;
  const width=tower?Math.max(b.width,artHeight*art.width/art.height):b.width*emphasis;
  return {...b,width,kind:'building' as const,art,artHeight,landmark:b.landmark||!!id};
 });
const treeSprites=[0,1,2].map(canopyArt);
const landscape=campus.trees.map(t=>({...campus.buildings[0],kind:'building' as const,id:t.id,name:'Woodland canopy',x:t.x,y:t.y,width:1.05,height:.3,rise:0,landmark:false,art:treeSprites[t.variant],artHeight:1.05}));
const marston=campus.buildings.find(b=>b.name==='Marston Science Library');
if(marston)landscape.push({...campus.buildings[0],kind:'building',id:'alachua-sculpture',name:'French Fries / Alachua',x:marston.x-marston.width/2-.6,y:marston.y-.3,width:15.24/campus.metersPerUnit,height:.5,rise:0,landmark:true,art:frenchFriesArt(),artHeight:1.2});
const anchor=toWorld({latitude:29.6485,longitude:-82.3437});
const routes=campus.walkways.map(path=>{
 let length=0;const distances=[0];
 for(let i=1;i<path.points.length;i++){length+=Math.hypot(path.points[i][0]-path.points[i-1][0],path.points[i][1]-path.points[i-1][1]);distances.push(length);}
 return {...path,length,distances};
});
const previewRoute=routes.filter(p=>p.length*campus.metersPerUnit>=35&&p.length*campus.metersPerUnit<=150).sort((a,b)=>Math.min(...a.points.map(p=>Math.hypot(p[0]-anchor.x,p[1]-anchor.y)))-Math.min(...b.points.map(p=>Math.hypot(p[0]-anchor.x,p[1]-anchor.y))))[0];
export const avatarWorldScale=1.7/campus.metersPerUnit/24;
export function previewWalk(index:number,seconds:number){
 const route=previewRoute;
 if(!route)return {...anchor,facing:1};
 const travel=(seconds*1.2/campus.metersPerUnit+index*5/campus.metersPerUnit)%(route.length*2);
 const distance=travel>route.length?route.length*2-travel:travel;
 const end=Math.max(1,route.distances.findIndex(d=>d>=distance));
 const a=route.points[end-1],b=route.points[end];
 const t=(distance-route.distances[end-1])/(route.distances[end]-route.distances[end-1]||1);
 return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,facing:(b[0]-a[0])*(travel>route.length?-1:1)>=0?1:-1};
}
// Only adjust a local GPS fix when a mapped public walkway is within GPS-scale error.
export function snapToWalkway(point:Coordinate,maxDistanceMeters=12):Coordinate{
 const p=toWorld(point);let best=maxDistanceMeters/campus.metersPerUnit,result=p;
 for(const route of routes)for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));
  const candidate={x:a[0]+dx*t,y:a[1]+dy*t},distance=Math.hypot(candidate.x-p.x,candidate.y-p.y);
  if(distance<best){best=distance;result=candidate;}
 }
 return fromWorld(result.x,result.y);
}
export function campusPeople(world:World,preview=false,seconds=0,ownPosition?:Coordinate|null){
 type Person={kind:'person';id:string;x:number;y:number;avatar:AvatarConfig;walking:boolean;facing:number;label:string};
 const people:Person[]=preview?previewAvatars.map((avatar,i)=>({kind:'person',id:'preview-'+i,...previewWalk(i,seconds),avatar:i===0?(world.profile?.avatar??avatar):avatar,walking:true,label:'PREVIEW'})):[];
 for(const p of world.presence)if(p.id!==world.profile?.id)people.push({kind:'person',id:p.id,...toWorld(p),avatar:p.avatar,walking:!!p.moving,facing:1,label:'FRIEND · APPROX.'});
 if(ownPosition&&inCampus(ownPosition))people.push({kind:'person',id:'self',...toWorld(snapToWalkway(ownPosition)),avatar:world.profile?.avatar??defaultAvatar,walking:false,facing:1,label:'YOU'});
 return people;
}
export function campusScene(world:World,preview:boolean,seconds:number,ownPosition:Coordinate|null|undefined,center:{x:number;y:number},span:number){
 const people=campusPeople(world,preview,seconds,ownPosition);
 const buildings=illustratedBuildings.filter(b=>Math.abs(b.x-center.x)<span/2+b.width/2&&b.y>center.y-span/2&&b.y-b.artHeight<center.y+span/2);
 buildings.push(...landscape.filter(t=>Math.abs(t.x-center.x)<span/2+t.width&&t.y>center.y-span/2&&t.y-t.artHeight<center.y+span/2));
 return [...buildings,...people.filter(p=>Math.abs(p.x-center.x)<span/2&&Math.abs(p.y-center.y)<span/2)].sort((a,b)=>a.y-b.y);
}
export function visibleWalkways(center:{x:number;y:number},span:number){
 return campus.walkways.filter(p=>{
  const xs=p.points.map(v=>v[0]),ys=p.points.map(v=>v[1]);
  return Math.min(...xs)<center.x+span/2&&Math.max(...xs)>center.x-span/2&&Math.min(...ys)<center.y+span/2&&Math.max(...ys)>center.y-span/2;
 });
}
