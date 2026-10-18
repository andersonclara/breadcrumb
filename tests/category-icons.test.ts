import {describe,expect,it} from 'vitest';
import {categories,categoryIconPixels,iconForRecord,type PixelIconName} from '@breadcrumb/shared';
describe('pixel category icons',()=>{
 const names:PixelIconName[]=[...categories.map(c=>c.id),'calendar','warning'];
 it('draws every category plus calendar and warning inside the 16x16 grid',()=>{
  for(const name of names){const pixels=categoryIconPixels(name);expect(pixels.length).toBeGreaterThan(0);expect(pixels.every(p=>p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=16&&p.y+p.h<=16)).toBe(true);}
 });
 it('returns stable arrays so renderers can cache sprite paths',()=>{
  for(const name of names)expect(categoryIconPixels(name)).toBe(categoryIconPixels(name));
  expect(categoryIconPixels('calendar')).toBe(categoryIconPixels('event'));
  expect(categoryIconPixels('warning')).toBe(categoryIconPixels('hazard'));
 });
 it('maps events to the calendar and crumbs to their category',()=>{
  expect(iconForRecord({kind:'event',category:null})).toBe('calendar');
  expect(iconForRecord({kind:'crumb',category:'hazard'})).toBe('hazard');
  expect(iconForRecord({kind:'crumb',category:'mystery'})).toBe('freebie');
  expect(iconForRecord({kind:'crumb',category:null})).toBe('freebie');
 });
});
