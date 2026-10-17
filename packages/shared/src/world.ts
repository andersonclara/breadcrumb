import campus from './campus-map.json';
import type { AvatarConfig } from './pixel';
import type { CrumbCategory } from './index';
import type {Community,CommunityId} from './communities';
export { campus };
export type Coordinate = { latitude: number; longitude: number };
export type WorldCrumb = Coordinate & { id:string; community_id?:CommunityId; title:string; description:string|null; category:CrumbCategory; state:'crumb'|'rising'|'full_loaf'|'stale'|'burnt'; confirm_count:number; dispute_count:number; related_posts:number; created_at:string; expires_at:string; my_vote:number|null; is_author:boolean };
export type Friend = { id:string; handle:string; avatar:AvatarConfig; accepted:boolean; incoming:boolean };
export type Presence = Coordinate & {id:string; handle:string; avatar:AvatarConfig; updated_at:string; expires_at:string; moving?:boolean};
export type World = { profile:{id:string;handle:string;avatar:AvatarConfig;avatar_completed:boolean;friend_code:string}|null; crumbs:WorldCrumb[]; friends:Friend[]; presence:Presence[];communities?:Community[] };
export const emptyWorld: World = {profile:null,crumbs:[],friends:[],presence:[]};
export function toWorld(point:Coordinate) {
  return { x:(point.longitude-campus.bounds.west)/(campus.bounds.east-campus.bounds.west)*campus.size,
    y:(campus.bounds.north-point.latitude)/(campus.bounds.north-campus.bounds.south)*campus.size };
}
export function fromWorld(x:number,y:number):Coordinate {
  return { longitude:campus.bounds.west+x/campus.size*(campus.bounds.east-campus.bounds.west), latitude:campus.bounds.north-y/campus.size*(campus.bounds.north-campus.bounds.south) };
}
export function inCampus(p:Coordinate) {return Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&p.latitude>=campus.bounds.south&&p.latitude<=campus.bounds.north&&p.longitude>=campus.bounds.west&&p.longitude<=campus.bounds.east;}
export function roundedLocation(p:Coordinate):Coordinate {return {latitude:Math.round(p.latitude*111320/100)*100/111320,longitude:Math.round(p.longitude*96750/100)*100/96750};}
export function distanceMeters(a:Coordinate,b:Coordinate) {return Math.hypot((a.latitude-b.latitude)*111320,(a.longitude-b.longitude)*96750);}
const stopWords = new Set(['the','at','in','on','near','outside','now','and','is','an','there']);
export function topicWords(text:string) {return [...new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(w=>(w.length>1||/^\d+$/.test(w))&&!stopWords.has(w)))];}
export function relatedCrumbs(crumbs:WorldCrumb[],title:string,category:string,point:Coordinate) {
 const words=topicWords(title);
 if(!words.length)return [];
 return crumbs.filter(c=>c.category===category&&distanceMeters(c,point)<=100&&topicWords(c.title).some(w=>words.includes(w))).slice(0,3);
}
