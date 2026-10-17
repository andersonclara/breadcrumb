import {toWorld,type WorldCrumb} from './world';
import type {PixelRect} from './pixel';

export type MapBuilding={id:string;name:string;x:number;y:number;width:number;height:number;rise:number;path:string;buildingNumber?:string|null};
type BuildingSprite=MapBuilding&{artHeight:number;art:{width:number;height:number;pixels:PixelRect[]}|null};
export function hitBuildingSprite(point:{x:number;y:number},buildings:BuildingSprite[]){
 for(let i=buildings.length-1;i>=0;i--){
  const b=buildings[i];if(b.name==='Woodland canopy'||b.id==='alachua-sculpture'||!b.art)continue;
  const x=(point.x-b.x+b.width/2)/b.width*b.art.width,y=(point.y-b.y+b.artHeight)/b.artHeight*b.art.height;
  if(b.art.pixels.some(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h))return b;
 }
 return null;
}
export function buildingLoaves(building:MapBuilding,crumbs:WorldCrumb[],metersPerUnit:number,now=Date.now()){
 return crumbs.filter(c=>{
  if(c.state!=='full_loaf'||Date.parse(c.expires_at)<=now)return false;
  const p=toWorld(c),dx=Math.max(0,Math.abs(p.x-building.x)-building.width/2),dy=Math.max(0,building.y-building.height-p.y,p.y-building.y);
  return Math.hypot(dx,dy)*metersPerUnit<=20;
 }).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
}
