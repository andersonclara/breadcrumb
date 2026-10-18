import {describe,it,expect} from 'vitest';
import {crumbDropPixels,CRUMB_DROP_DURATION} from '@breadcrumb/shared';

describe('crumb drop animation',()=>{
 it('starts the toast exactly at the cursor hotspot rather than above the map',()=>{
  const frame=crumbDropPixels(0,{x:0,y:-72});
  expect(frame[0]).toMatchObject({x:-11,y:-81,w:18,h:19});
  const start=crumbDropPixels(220,{x:0,y:-72}).find(p=>p.color==='#C78532')!;
  const landing=crumbDropPixels(950,{x:0,y:-72}).find(p=>p.color==='#C78532')!;
  expect(start.y).toBeLessThan(landing.y);
 });
 it('shows a loaf first, then a falling crumb, then clears at completion',()=>{
  expect(crumbDropPixels(0).length).toBeGreaterThan(0);
  const crumb=(time:number)=>crumbDropPixels(time).find(p=>p.color==='#C78532')!;
  expect(crumb(350).y).toBeLessThan(crumb(600).y);
  expect(crumb(600).y).toBeLessThan(crumb(750).y);
  expect(crumbDropPixels(CRUMB_DROP_DURATION)).toEqual([]);
 });
 it('keeps frames finite and visible with valid opacity',()=>{
  for(let time=0;time<CRUMB_DROP_DURATION;time+=25)for(const p of crumbDropPixels(time)){
   expect([p.x,p.y,p.w,p.h,p.opacity].every(Number.isFinite)).toBe(true);
   expect(p.w).toBeGreaterThan(0);expect(p.h).toBeGreaterThan(0);
   expect(p.opacity).toBeGreaterThanOrEqual(0);expect(p.opacity).toBeLessThanOrEqual(1);
  }
 });
});
