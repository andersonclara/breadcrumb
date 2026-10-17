import {describe,it,expect} from 'vitest';
import {nearbyPostBuildings,postLocation,describePostLocation,landmarks} from '@breadcrumb/shared';
describe('optional building placement',()=>{
 const origin={latitude:29.64795,longitude:-82.3438};
 it('keeps the precise clicked coordinate unless a building is chosen, and restores it',()=>{
  const options=nearbyPostBuildings(origin);
  expect(options.length).toBeGreaterThan(0);
  expect(postLocation(origin,options,'')).toBe(origin);
  expect(postLocation(origin,options,options[0].id)).toBe(options[0].point);
  expect(postLocation(origin,options,'')).toBe(origin);
  expect(postLocation(origin,options,'old-building-id')).toBe(origin);
 });
 it('only offers buildings close to the original click, ordered by distance',()=>{
  const options=nearbyPostBuildings(landmarks.find(l=>l.id==='marston')!);
  expect(options.some(b=>/Marston/i.test(b.name))).toBe(true);
  expect(options.every(b=>b.distance<=150)).toBe(true);
  expect(options.length).toBeLessThanOrEqual(12);
  expect(options.map(b=>b.distance)).toEqual(options.map(b=>b.distance).sort((a,b)=>a-b));
 });
 it('describes the clicked spot without moving it or claiming it is indoors',()=>{
  const building={id:'marston',name:'Marston Science Library',distance:10,point:origin};
  expect(describePostLocation(origin,[building])).toMatch(/outside Marston Science Library/i);
  expect(describePostLocation(origin,[{...building,distance:60}])).toMatch(/near Marston Science Library/i);
  expect(describePostLocation(origin,[{...building,distance:0}])).toBe('At Marston Science Library');
  expect(describePostLocation(origin,[])).toMatch(/^Campus (path|map spot)$/);
  expect(postLocation(origin,[building],'')).toBe(origin);
 });
});
