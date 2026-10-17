import {describe,expect,it} from 'vitest';
import {avatarOptions,avatarPixels,validAvatar,defaultAvatar,roundedLocation,distanceMeters,toWorld,fromWorld,inCampus,relatedCrumbs,previewWalk,snapToWalkway,campus,type WorldCrumb} from '@breadcrumb/shared';
describe('pixel world rules',()=>{
 it('keeps preview walkers on public paths and moves at walking speed',()=>{
  const p=previewWalk(0,0),q=previewWalk(0,.5);
  expect(Math.hypot(p.x-q.x,p.y-q.y)*campus.metersPerUnit).toBeCloseTo(.6,1);
  for(const seconds of [0,10,50,100,300]){const w=previewWalk(0,seconds),point=fromWorld(w.x,w.y);expect(distanceMeters(point,snapToWalkway(point))).toBeLessThan(.01);}
 });
 it('round trips real map coordinates',()=>{const point={latitude:29.6465,longitude:-82.347};const p=toWorld(point);expect(fromWorld(p.x,p.y)).toEqual(point);expect(inCampus(point)).toBe(true);expect(inCampus({latitude:0,longitude:0})).toBe(false);});
 it('rounds presence before sending without exceeding a 100m cell diagonal',()=>{const p={latitude:29.64651234,longitude:-82.34712345};const q=roundedLocation(p);expect(q).not.toEqual(p);expect(distanceMeters(p,q)).toBeLessThan(71);expect(roundedLocation(q)).toEqual(q);});
 it('validates every customizable avatar layer and rejects injected fields',()=>{
  expect(validAvatar(defaultAvatar)).toBe(true);expect(validAvatar({...defaultAvatar,skin:-1})).toBe(false);expect(validAvatar({...defaultAvatar,skin:'1'})).toBe(false);expect(validAvatar({...defaultAvatar,admin:true})).toBe(false);
  for(const [key,options] of Object.entries(avatarOptions))for(let i=0;i<options.length;i++){const a={...defaultAvatar,[key]:i};expect(validAvatar(a)).toBe(true);expect(avatarPixels(a).every(p=>p.x>=0&&p.y>=0&&p.x+p.w<=16&&p.y+p.h<=24)).toBe(true);}
 });
 it('only suggests related crumbs in the same category and within 100m',()=>{
  const c={id:'pizza',title:'Free pizza at Turlington',category:'freebie',latitude:29.6465,longitude:-82.347} as WorldCrumb;
  expect(relatedCrumbs([c,{...c,id:'far',latitude:29.65},{...c,id:'wrong-category',category:'hazard'}],'Pizza outside Turlington','freebie',c).map(c=>c.id)).toEqual(['pizza']);
 });
});
