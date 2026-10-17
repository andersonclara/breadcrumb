import {describe,it,expect} from 'vitest';
import {pinchCamera} from '../apps/mobile/src/lib/map-gesture';
describe('mobile pinch camera',()=>{
 it('zooms around the two-finger midpoint while allowing a two-finger pan',()=>{
  const size={width:400,height:600},anchor={x:120,y:90};
  const result=pinchCamera(10,100,200,anchor,{x:250,y:350},size);
  expect(result.zoom).toBe(20);
  const scale=320/result.zoom/600;
  expect(result.center.x+(250-200)*scale).toBeCloseTo(anchor.x);
  expect(result.center.y+(350-300)*scale).toBeCloseTo(anchor.y);
 });
 it('clamps zoom and keeps degenerate touch distances finite',()=>{
  const anchor={x:160,y:160},midpoint={x:200,y:300},size={width:400,height:600};
  expect(pinchCamera(64,100,1000,anchor,midpoint,size).zoom).toBe(128);
  expect(pinchCamera(2,100,1,anchor,midpoint,size).zoom).toBe(1);
  expect(Number.isFinite(pinchCamera(2,0,20,anchor,midpoint,size).center.x)).toBe(true);
 });
});
