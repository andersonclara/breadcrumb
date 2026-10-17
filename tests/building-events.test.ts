import {describe,it,expect} from 'vitest';
import {buildingLoaves,fromWorld,hitBuildingSprite,type WorldCrumb} from '@breadcrumb/shared';

describe('building exploration',()=>{
 const building={id:'hall',name:'Hall',x:100,y:100,width:4,height:5,rise:1,path:''};
 it('shows live full loaves near the selected building, excluding distant or expired posts',()=>{
  const now=Date.now(),crumb={id:'here',...fromWorld(100,98),state:'full_loaf',expires_at:new Date(now+60000).toISOString(),created_at:new Date(now).toISOString()} as WorldCrumb;
  const crumbs=[crumb,{...crumb,id:'near',...fromWorld(102.5,98)},{...crumb,id:'far',...fromWorld(150,98)},{...crumb,id:'expired',expires_at:new Date(now-1000).toISOString()},{...crumb,id:'unconfirmed',state:'rising' as const}];
  expect(buildingLoaves(building,crumbs,12.7,now).map(c=>c.id)).toEqual(['here','near']);
 });
 it('hit-tests drawn pixels, lets transparent areas pass through, and prioritizes the front building',()=>{
  const sprite={...building,artHeight:6,art:{width:4,height:6,pixels:[{x:1,y:1,w:2,h:4,color:'#fff'}]}};
  expect(hitBuildingSprite({x:100,y:98},[sprite])?.id).toBe('hall');
  expect(hitBuildingSprite({x:98.1,y:94.1},[sprite])).toBeNull();
  expect(hitBuildingSprite({x:100,y:98},[sprite,{...sprite,id:'front'}])?.id).toBe('front');
  expect(hitBuildingSprite({x:100,y:98},[{...sprite,name:'Woodland canopy'}])).toBeNull();
 });
});
