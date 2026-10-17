import {campus,toWorld,fromWorld,inCampus,type Coordinate,type World} from './world';
import {defaultAvatar,type AvatarConfig} from './pixel';
import {identifyLandmark,campusLandmarkSprites} from './campus-landmarks';
import {previewAvatars} from './landmarks';
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
export function campusScene(world:World,preview:boolean,seconds:number,ownPosition:Coordinate|null|undefined,center:{x:number;y:number},span:number){
 type Person={kind:'person';id:string;x:number;y:number;avatar:AvatarConfig;walking:boolean;facing:number;label:string};
 const people:Person[]=preview?previewAvatars.map((avatar,i)=>({kind:'person',id:'preview-'+i,...previewWalk(i,seconds),avatar:i===0?(world.profile?.avatar??avatar):avatar,walking:true,label:'PREVIEW'})):[];
 for(const p of world.presence)if(p.id!==world.profile?.id)people.push({kind:'person',id:p.id,...toWorld(p),avatar:p.avatar,walking:!!p.moving,facing:1,label:'FRIEND · APPROX.'});
 if(ownPosition&&inCampus(ownPosition))people.push({kind:'person',id:'self',...toWorld(snapToWalkway(ownPosition)),avatar:world.profile?.avatar??defaultAvatar,walking:false,facing:1,label:'YOU'});
 const buildings=campus.buildings.filter(b=>Math.abs(b.x-center.x)<span/2+b.width/2&&b.y>center.y-span/2&&b.y-b.height-b.rise<center.y+span/2).map(b=>{const id=identifyLandmark(b.name);return {...b,kind:'building' as const,art:id?campusLandmarkSprites[id]:null,artHeight:id==='century'?b.rise+b.height:Math.max(b.height*.6+b.rise,b.width*.48),landmark:b.landmark||!!id};});
 const plaza=campus.labels.find(l=>l.name==='Plaza of the Americas');
 if(plaza&&Math.abs(plaza.x-center.x)<span/2+5&&Math.abs(plaza.y-center.y)<span/2+5)buildings.push({...campus.buildings[0],kind:'building',id:'plaza-art',name:plaza.name,x:plaza.x,y:plaza.y+3,width:8,height:5,rise:0,landmark:true,art:campusLandmarkSprites.plaza,artHeight:6});
 return [...buildings,...people.filter(p=>Math.abs(p.x-center.x)<span/2&&Math.abs(p.y-center.y)<span/2)].sort((a,b)=>a.y-b.y);
}
export function visibleWalkways(center:{x:number;y:number},span:number){
 return campus.walkways.filter(p=>{
  const xs=p.points.map(v=>v[0]),ys=p.points.map(v=>v[1]);
  return Math.min(...xs)<center.x+span/2&&Math.max(...xs)>center.x-span/2&&Math.min(...ys)<center.y+span/2&&Math.max(...ys)>center.y-span/2;
 });
}
