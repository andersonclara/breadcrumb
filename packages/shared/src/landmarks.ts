import type {AvatarConfig, PixelRect} from './pixel';

// Anchors are geographic; the illustrated facades are deliberately enlarged for the overworld.
export const landmarks = [
 {
  "id": "stadium",
  "name": "The Swamp",
  "latitude": 29.65003370125,
  "longitude": -82.3488406478125,
  "width": 128,
  "height": 96
 },
 {
  "id": "century",
  "name": "Century Tower",
  "latitude": 29.648813797109376,
  "longitude": -82.3433212965625,
  "width": 128,
  "height": 96
 },
 {
  "id": "odome",
  "name": "O?Dome",
  "latitude": 29.64943000265625,
  "longitude": -82.35111509875,
  "width": 128,
  "height": 96
 },
 {
  "id": "reitz",
  "name": "Reitz Union",
  "latitude": 29.646223700078124,
  "longitude": -82.347875048125,
  "width": 128,
  "height": 96
 },
 {
  "id": "marston",
  "name": "Marston Science Library",
  "latitude": 29.647958100234376,
  "longitude": -82.3439545975,
  "width": 128,
  "height": 96
 },
 {
  "id": "west",
  "name": "Library West",
  "latitude": 29.651401099609377,
  "longitude": -82.3429113503125,
  "width": 128,
  "height": 96
 },
 {
  "id": "malachowsky",
  "name": "Malachowsky Hall",
  "latitude": 29.64403429890625,
  "longitude": -82.347779603125,
  "width": 128,
  "height": 96
 },
 {
  "id": "plaza",
  "name": "Plaza of the Americas",
  "latitude": 29.650709249441963,
  "longitude": -82.34239609375,
  "width": 128,
  "height": 96
 }
] as const;
export function landmarkPixels(id:string):PixelRect[]{
 const p:PixelRect[]=[];
 const r=(x:number,y:number,w:number,h:number,color:string)=>p.push({x,y,w,h,color});
 const brick='#AE624B',shade='#784536',stone='#E9CF99',dark='#443D38',light='#D38963';
 if(id==='century'){
  r(3,55,21,3,'#7C8C64');r(4,5,16,51,dark);r(5,6,11,49,brick);r(16,6,4,49,shade);
  r(3,3,18,3,stone);r(4,0,3,4,stone);r(10,0,3,4,stone);r(17,0,3,4,stone);
  r(4,27,16,2,stone);r(3,53,18,3,stone);
  for(const x of [7,12]){r(x,9,3,15,stone);r(x+1,10,1,13,dark);r(x,32,2,17,shade);r(x,32,1,16,light);}
  r(18,10,1,14,dark);r(18,32,1,17,dark);r(4,7,1,46,stone);r(15,7,1,46,stone);
  for(let y=30;y<52;y+=4){r(6,y,3,1,light);r(11,y+2,3,1,light);}
 }else{
  r(1,33,63,3,'#7C8C64');r(1,14,62,20,dark);r(2,15,60,18,brick);
  r(1,10,62,5,'#645B58');r(4,8,55,2,'#82756A');r(0,14,64,2,stone);
  r(25,6,15,28,shade);r(26,7,12,26,brick);r(24,5,17,2,stone);
  for(const x of [25,31,37])r(x,2,3,4,stone);
  r(27,17,10,16,stone);r(29,19,6,14,dark);r(30,17,4,2,stone);r(31,21,1,12,'#A17A53');
  r(28,9,7,6,stone);r(29,10,2,4,dark);r(32,10,2,4,dark);
  for(const x of [5,12,19,43,50,57])for(const y of [18,26]){r(x,y,4,6,stone);r(x+1,y+1,2,4,'#6B8385');r(x+1,y+3,2,1,stone);}
  r(1,32,62,2,stone);r(27,33,12,2,stone);
 }
 return p;
}
export const previewAvatars:AvatarConfig[]=[
 {skin:1,hair:0,shirt:3,pants:0,hairstyle:2,top:1,accessory:0},
 {skin:3,hair:0,shirt:2,pants:1,hairstyle:1,top:2,accessory:3},
 {skin:0,hair:4,shirt:4,pants:3,hairstyle:0,top:0,accessory:2},
];
// Original code-drawn toast frames inspired by the supplied golden bread/crumb strip.
export function toastPixels(frame=0):PixelRect[]{
 const p:PixelRect[]=[];const r=(x:number,y:number,w:number,h:number,color:string)=>p.push({x,y,w,h,color});
 const f=Math.max(0,Math.min(9,frame)),cream='#FFF5C4',gold='#FFC65A',crust='#D98A36';
 if(f<5){
  const cut=f>1?Math.min(9,(f-1)*3):0;
  r(5,7,18,19,crust);r(3,5,8,7,crust);r(17,5,8,7,crust);
  r(6,7,16,18,cream);r(4,6,7,5,cream);r(18,6,6,5,cream);
  r(8,10,12,13,gold);r(6,8,4,4,gold);r(19,8,3,4,gold);
  if(cut){ // Remove pixels on a diagonal, leaving the flying bite as a separate piece below.
   return p.flatMap(rect=>Array.from({length:rect.h},(_,dy)=>Array.from({length:rect.w},(_,dx)=>({x:rect.x+dx,y:rect.y+dy,w:1,h:1,color:rect.color})))).flat().filter(rect=>rect.x+cut<29||rect.y>12+cut)
    .concat([{x:24+f,y:4+f,w:4,h:4,color:cream},{x:25+f,y:5+f,w:2,h:2,color:gold}]);
  }
 }else{
  const y=6+(f-5)*4,w=Math.max(2,9-(f-5)*2);
  r(15-w/2,y,w,w,cream);r(16-w/2,y+1,Math.max(1,w-2),Math.max(1,w-2),gold);
  if(f<8){r(5+f,y+7,2,2,gold);r(25,y+3,2,2,gold);}
 }
 return p;
}
