import {describe,it,expect} from 'vitest';
import {campus,emptyWorld,previewWalk,campusScene,campusPeople,fromWorld,toWorld} from '@breadcrumb/shared';
import {cameraMatrix,screenToWorld,panCamera,zoomCamera,needsSceneRefresh,type MapCamera} from '../apps/mobile/src/lib/map-gesture';
import {createSpatialIndex,pointsBounds,queryMapScene,sceneBounds,pixelPaths} from '../apps/mobile/src/lib/map-scene';

describe('mobile camera and hit coordinates',()=>{
 it.each([{width:390,height:700},{width:900,height:500}])('keeps rendered locations and tap coordinates aligned after pan, pinch and resize (%j)',size=>{
  let camera:MapCamera={x:130,y:100,zoom:24};
  camera=panCamera(camera,{x:57,y:-31},size);
  const anchor=screenToWorld(camera,{x:150,y:200},size);
  camera=zoomCamera(camera.zoom,2.3,anchor,{x:165,y:230},size);
  expect(screenToWorld(camera,{x:165,y:230},size).x).toBeCloseTo(anchor.x);
  expect(screenToWorld(camera,{x:165,y:230},size).y).toBeCloseTo(anchor.y);
  const geographic=fromWorld(anchor.x+.3,anchor.y-.2),world=toWorld(geographic);
  const [a,b,c,d,tx,ty]=cameraMatrix(camera,size);
  const tapped=screenToWorld(camera,{x:a*world.x+c*world.y+tx,y:b*world.x+d*world.y+ty},size);
  expect(tapped.x).toBeCloseTo(world.x);
  expect(tapped.y).toBeCloseTo(world.y);
 });
 it('clamps camera bounds and zoom without moving the pinch anchor at a zoom limit',()=>{
  const size={width:400,height:600};
  expect(panCamera({x:0,y:320,zoom:1},{x:999,y:-999},size)).toEqual({x:0,y:320,zoom:1});
  const anchor={x:140,y:120},midpoint={x:140,y:220};
  for(const ratio of [.00001,10000]){
   const camera=zoomCamera(24,ratio,anchor,midpoint,size);
   expect(camera.zoom).toBe(ratio<1?1:128);
   expect(screenToWorld(camera,midpoint,size).x).toBeCloseTo(anchor.x);
   expect(screenToWorld(camera,midpoint,size).y).toBeCloseTo(anchor.y);
  }
 });
 it('uses the overscan buffer for small moves and refreshes before it is exhausted',()=>{
  const previous={x:140,y:120,zoom:24},span=320/previous.zoom;
  expect(needsSceneRefresh({...previous,x:previous.x+span*.1},previous)).toBe(false);
  expect(needsSceneRefresh({...previous,x:previous.x+span*.21},previous)).toBe(true);
  expect(needsSceneRefresh({...previous,zoom:previous.zoom/1.21},previous)).toBe(true);
  const oldBounds=sceneBounds(previous),moved={...previous,x:previous.x+span*.21,zoom:previous.zoom/1.19},viewport=sceneBounds(moved,1);
  expect(viewport.left).toBeGreaterThan(oldBounds.left);
  expect(viewport.right).toBeLessThan(oldBounds.right);
 });
});

describe('indexed map scenery',()=>{
 it('finds crossing, negative-coordinate and large features once, in painter order',()=>{
  const features=[{left:-20,top:-10,right:20,bottom:10},{left:0,top:0,right:1,bottom:1},{left:-400,top:-400,right:800,bottom:800},{left:15,top:15,right:18,bottom:18}];
  const query=createSpatialIndex(features,b=>b,2);
  expect(query({left:-1,top:-1,right:2,bottom:2})).toEqual(features.slice(0,3));
  expect(query({left:18,top:18,right:19,bottom:19})).toEqual([features[2],features[3]]);
 });
 it.each([1,2,8,24,128])('matches brute-force walkway visibility and keeps buildings and roads in the buffer at zoom %s',zoom=>{
  const camera={...previewWalk(0,0),zoom},scene=queryMapScene(camera),bounds=scene.bounds;
  const expected=campus.walkways.filter(p=>{
   const b=pointsBounds(p.points,p.width/2);
   return b.left<=bounds.right&&b.right>=bounds.left&&b.top<=bounds.bottom&&b.bottom>=bounds.top;
  });
  const actualPaths=scene.walkways.map(p=>p.path).join('');
  expect((actualPaths.match(/M/g)??[]).length).toBe(expected.length);
  for(const p of expected)expect(actualPaths).toContain(p.path);
  const roads=scene.roads.map(p=>p.path).join('');
  // Inset viewport: a feature containing the center must never disappear.
  for(const road of campus.roads){
   const values=road.path.match(/-?\d*\.?\d+/g)!.map(Number);
   const points:number[][]=[];for(let i=0;i<values.length;i+=2)points.push(values.slice(i,i+2));
   const b=pointsBounds(points,road.width/2);
   if(b.left<=camera.x&&b.right>=camera.x&&b.top<=camera.y&&b.bottom>=camera.y)expect(roads).toContain(road.path);
  }
  const plaza=campus.labels.find(p=>p.name==='Plaza of the Americas')!;
  const localCamera={...camera,x:plaza.x,y:plaza.y},local=queryMapScene(localCamera),visible=sceneBounds(localCamera,1);
  // Compare to current artwork rather than requiring a removed synthetic plaza sprite.
  const expectedBuildings=campusScene(emptyWorld,false,0,null,localCamera,320/zoom).filter(b=>b.kind==='building'&&b.x>=visible.left&&b.x<=visible.right);
  for(const b of expectedBuildings)expect(local.buildings.map(b=>b.id)).toContain(b.id);
 });
 it('culls the starting view and batches road/walkway elements instead of mounting thousands',()=>{
  const scene=queryMapScene({...previewWalk(0,0),zoom:24});
  expect(scene.roads.length+scene.walkways.length).toBeLessThan(40);
  expect(scene.roads.map(p=>p.path).join('').length).toBeLessThan(campus.roads.map(p=>p.path).join('').length/10);
  expect(scene.buildings.length).toBeLessThan(100);
  expect(scene.terrain.map(p=>p.path).join('').length).toBeLessThan(campus.paths.join('').length/10);
 });
 it('retains every cached terrain strip in the full-campus view',()=>{
  const scene=queryMapScene({x:160,y:160,zoom:1});
  const actual=scene.terrain.map(p=>p.path).join('');
  for(const path of campus.paths)for(const strip of path.match(/M[^M]+/g)??[])expect(actual).toContain(strip);
 });
 it('keeps the old shared scene person data and ordering when separating animation from buildings',()=>{
  const center=previewWalk(0,0),people=campusPeople(emptyWorld,true,0);
  const oldPeople=campusScene(emptyWorld,true,0,null,center,320).filter(p=>p.kind==='person');
  expect(oldPeople).toEqual([...people].sort((a,b)=>a.y-b.y));
 });
 it('merges sprite rectangles without changing overlapping color order',()=>{
  const paths=pixelPaths([{x:0,y:0,w:4,h:4,color:'red'},{x:6,y:0,w:2,h:2,color:'red'},{x:1,y:1,w:2,h:2,color:'blue'},{x:2,y:2,w:1,h:1,color:'red'}]);
  expect(paths.map(p=>p.color)).toEqual(['red','blue','red']);
  expect((paths[0].path.match(/M/g)??[]).length).toBe(2);
 });
});
