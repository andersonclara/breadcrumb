import {describe,it,expect} from 'vitest';
import {campus,groundMaterial,visibleGround} from '@breadcrumb/shared';
import {clipRing} from '../scripts/ground-surfaces.mjs';
import {inferBuildingGround} from '../scripts/building-ground.mjs';

describe('mapped ground surfaces',()=>{
 it('fills only building footprints from neighboring grass and brick, retaining courtyards',()=>{
  const surfaces=[{material:'grass',path:'M0 0L10 0L10 40L0 40Z'},{material:'brick',path:'M30 0L40 0L40 40L30 40Z'}];
  const building={id:'test',x:20,y:40,width:20,height:40,rise:0,path:'M10 0L30 0L30 40L10 40ZM15 15L25 15L25 25L15 25Z'};
  const fill=inferBuildingGround(surfaces,[building],64);
  expect(fill.map(s=>s.material).sort()).toEqual(['brick','grass']);
  expect(fill.every(s=>s.inferred&&s.left===10&&s.right===30&&s.top===0&&s.bottom===40)).toBe(true);
  expect(fill.every(s=>!s.path.includes('M15 15h'))).toBe(true);
  const fallback=inferBuildingGround([],[building],64);
  expect(fallback.map(s=>s.material)).toEqual(['concrete']);
 });
 it('clips overlapping tile buffers without moving interior points',()=>{
  const clipped=clipRing([[-1,-1],[2,-1],[2,2],[-1,2],[-1,-1]],[0,0,1,1]);
  expect(clipped).toHaveLength(5);
  expect(clipped.every(([x,y]:number[])=>x>=0&&x<=1&&y>=0&&y<=1)).toBe(true);
  const interior=[[.1,.1],[.9,.1],[.9,.9],[.1,.1]];
  expect(clipRing(interior,[0,0,1,1])).toEqual(interior);
 });
 it('includes authoritative paved surfaces instead of treating all ground as grass',()=>{
  for(const material of ['brick','concrete','asphalt','grass','wood','gravel'])expect(campus.surfaces.some(s=>s.material===material)).toBe(true);
  expect(groundMaterial('unmapped').name).toBe('Unclassified surface');
  expect(groundMaterial('brick').name).toBe('Brick / pavers');
  const b=campus.buildings.find(b=>b.name==='Century Tower')!;
  const near=visibleGround(b,15);
  expect(near.some(s=>s.material==='brick')).toBe(true);
  expect(near.some(s=>s.material==='concrete')).toBe(true);
  expect(near.length).toBeLessThan(campus.surfaces.length);
 });
});
