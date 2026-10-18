import {describe,it,expect} from 'vitest';
import {campus,campusScene,emptyWorld} from '@breadcrumb/shared';

describe('campus catalog',()=>{
 it('keeps a single full stadium and preserves landmark identities after importing UF names',()=>{
  for(const name of ['Century Tower','Ben Hill Griffin Stadium','Marston Science Library','Library West'])expect(campus.buildings.filter(b=>b.name===name)).toHaveLength(1);
  const stadium=campus.buildings.find(b=>b.name==='Ben Hill Griffin Stadium')!;
  expect(stadium.width*campus.metersPerUnit).toBeGreaterThan(200);
  for(const name of ['Reitz Student Union','Malachowsky DSIT','O`Connell Center']){
   const b=campus.buildings.find(b=>b.name===name)!;
   const scene=campusScene(emptyWorld,false,0,null,b,20);
   expect(scene.some(o=>o.kind==='building'&&o.id===b.id&&o.landmark)).toBe(true);
  }
 });
 it('retains official building numbers and distinguishes missing names',()=>{
  const official=campus.buildings.filter(b=>b.nameSource==='UF public building catalog');
  expect(official.length).toBeGreaterThan(1000);
  expect(official.every(b=>b.officialName?b.name===b.officialName:!b.name||b.name===`UF Building ${b.buildingNumber}`)).toBe(true);
  expect(campus.buildings.every(b=>!b.name.includes('undefined'))).toBe(true);
 });
 it('enlarges the tower while retaining its ground anchor',()=>{
  const b=campus.buildings.find(b=>b.name==='Century Tower')!;
  const tower=campusScene(emptyWorld,false,0,null,b,20).find(o=>o.kind==='building'&&o.id===b.id)!;
  if(tower.kind!=='building')throw Error('Missing tower');
  expect(tower.x).toBe(b.x);expect(tower.y).toBe(b.y);
  expect(tower.artHeight).toBeGreaterThan(47.85/campus.metersPerUnit*1.6);
 });
});
