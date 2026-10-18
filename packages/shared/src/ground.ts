import {campus} from './world';
export * from './ground-materials';
export function visibleGround(center:{x:number;y:number},span:number){
 return campus.surfaces.filter(s=>s.left<center.x+span/2&&s.right>center.x-span/2&&s.top<center.y+span/2&&s.bottom>center.y-span/2);
}
