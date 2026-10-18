import {describe,it,expect} from 'vitest';
import {breadPixels} from '@breadcrumb/shared';

describe('golden breadcrumb progress',()=>{
 it('keeps the familiar loaf silhouette with a charred palette for burnt events',()=>{
  const burnt=breadPixels('burnt'),golden=breadPixels('full_loaf');
  expect(burnt.map(({x,y,w,h})=>({x,y,w,h}))).toEqual(golden.map(({x,y,w,h})=>({x,y,w,h})));
  expect(burnt.every(p=>['#302925','#76503A','#45332C'].includes(p.color))).toBe(true);
 });
 it('grows visibly from a crumb through rising to a full loaf using the golden palette',()=>{
  const sizes=(['crumb','rising','full_loaf'] as const).map(state=>{
   const pixels=breadPixels(state);
   expect(pixels.every(p=>['#D98A36','#FFF5C4','#FFC65A'].includes(p.color))).toBe(true);
   return Math.max(...pixels.map(p=>p.x+p.w))-Math.min(...pixels.map(p=>p.x));
  });
  expect(sizes[0]).toBeLessThan(sizes[1]);expect(sizes[1]).toBeLessThan(sizes[2]);
 });
});
