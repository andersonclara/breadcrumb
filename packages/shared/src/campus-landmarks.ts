import type {PixelRect} from './pixel';
export type LandmarkId='stadium'|'century'|'odome'|'reitz'|'marston'|'west'|'plaza'|'malachowsky';
export const landmarkNames:Record<LandmarkId,string>={stadium:'The Swamp',century:'Century Tower',odome:"O’Dome",reitz:'Reitz Union',marston:'Marston',west:'Library West',plaza:'Plaza of the Americas',malachowsky:'Malachowsky'};
export function identifyLandmark(name:string):LandmarkId|null{
 if(/Ben Hill Griffin Stadium/.test(name))return 'stadium';
 if(name==='Century Tower')return 'century';
 if(/Exactech Arena|O.Connell Center/.test(name))return 'odome';
 if(/^(J. Wayne )?Reitz (Student )?Union$/.test(name))return 'reitz';
 if(name==='Marston Science Library')return 'marston';
 if(name==='Library West')return 'west';
 if(name==='Plaza of the Americas')return 'plaza';
 if(/Malachowsky/.test(name))return 'malachowsky';
 return null;
}
// Original architectural pixel illustrations. Every shape is snapped to a pixel grid.
export function campusLandmarkArt(id:LandmarkId):{width:number;height:number;pixels:PixelRect[]}{
 const pixels:PixelRect[]=[];const width=id==='century'?32:128,height=id==='century'?112:96;
 const r=(x:number,y:number,w:number,h:number,color:string)=>pixels.push({x,y,w,h,color});
 const poly=(points:number[][],color:string)=>{
  for(let y=Math.min(...points.map(p=>p[1]));y<Math.max(...points.map(p=>p[1]));y++){
   const xs:number[]=[];for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
   xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)r(Math.ceil(xs[i]),y,Math.max(1,Math.floor(xs[i+1])-Math.ceil(xs[i])),1,color);
  }
 };
 const brick='#BA6A4E',brickLight='#D88A63',brickDark='#874635',stone='#F0DBAD',glass='#659CA8',dark='#334854',cream='#FFF0CB';

 const tree=(x:number,y:number)=>{r(x+5,y+13,3,11,'#81553D');r(x+2,y+3,10,15,'#438C55');r(x,y+7,15,8,'#438C55');r(x+3,y,8,14,'#68B762');r(x+2,y+5,8,5,'#89CB6A');r(x+12,y+14,3,4,'#386E4C');};
 const flag=(x:number,y:number)=>{r(x,y,1,17,stone);r(x+1,y,10,4,'#F1913E');r(x+1,y+4,10,4,'#447CC2');};
 if(id==='century'){
  r(3,106,28,5,'#78985E');poly([[7,17],[23,13],[30,17],[30,105],[7,109]],brickDark);r(7,17,17,88,brick);r(9,18,2,85,brickLight);
  r(6,11,19,7,stone);poly([[25,11],[30,14],[30,19],[25,17]],'#B69D7A');
  for(const x of [6,13,21])r(x,6,4,7,stone);r(27,9,3,5,'#B69D7A');
  for(const x of [11,18]){r(x,21,4,28,stone);r(x+1,23,2,24,dark);for(let y=25;y<47;y+=3)r(x+1,y,2,1,'#BCB08E');r(x,57,2,43,stone);r(x+1,58,1,41,'#A77857');}
  r(26,23,2,24,dark);r(26,58,1,42,stone);r(6,51,19,3,stone);r(5,103,22,4,stone);
  for(let y=59;y<99;y+=5){r(12,y,3,1,brickLight);r(17,y+2,3,1,brickLight);}return {width,height,pixels};
 }
 if(id==='stadium'){
  // Raised horseshoe bowl: brick arcade below terraced orange-and-blue stands.
  poly([[4,43],[28,23],[99,23],[124,43],[124,77],[101,94],[27,94],[4,77]],'#674A3D');
  poly([[5,46],[28,62],[100,62],[123,46],[123,76],[100,91],[28,91],[5,76]],brick);
  poly([[100,62],[123,46],[123,76],[100,91]],brickDark);
  r(29,64,70,26,brickLight);r(28,65,72,3,stone);r(28,86,72,3,stone);
  for(let x=32;x<98;x+=9){r(x,70,5,13,brickDark);r(x+1,71,3,11,dark);r(x-1,69,7,2,stone);r(x,82,5,2,stone);}
  for(let i=0;i<4;i++){const y=57+i*6;poly([[8,y],[24,y+10],[24,y+14],[8,y+4]],stone);poly([[105,y+10],[120,y],[120,y+4],[105,y+14]],'#B99E7A');}
  // Concentric seating terraces leave a recessed, readable field.
  poly([[5,38],[29,17],[98,17],[123,38],[123,59],[99,76],[28,76],[5,59]],stone);
  for(let i=0;i<8;i++){
   const inset=i*2;
   poly([[9+inset,38+i],[31+i,20+inset],[96-i,20+inset],[119-inset,38+i],[119-inset,57-i],[97-i,72-inset],[30+i,72-inset],[9+inset,57-i]],i%2?'#3872B1':'#F3A34C');
  }
  // Long axis runs north/south in the bowl, with blue/orange end zones.
  poly([[43,34],[85,34],[99,46],[85,59],[43,59],[29,46]],'#448C54');
  poly([[45,36],[83,36],[93,46],[83,56],[45,56],[35,46]],'#62B16B');
  poly([[43,34],[49,34],[41,46],[49,59],[43,59],[29,46]],'#2D66A7');
  poly([[79,34],[85,34],[99,46],[85,59],[79,59],[90,46]],'#E68932');
  for(let x=49;x<=79;x+=6){r(x,36,1,21,'#E8F0CB');r(x-1,41,3,1,cream);r(x-1,51,3,1,cream);}
  r(47,36,33,1,cream);r(47,56,33,1,cream);
  // Center-field orange F and goal posts.
  r(62,42,3,9,'#F6A13C');r(65,42,6,2,'#F6A13C');r(65,46,4,2,'#F6A13C');
  for(const x of [34,94]){r(x,40,1,11,'#FFE88C');r(x-3,39,7,1,'#FFE88C');r(x-3,35,1,5,'#FFE88C');r(x+3,35,1,5,'#FFE88C');}
  // West-side press box, glazing, roof and upper deck supports.
  r(30,6,67,13,brickDark);r(28,5,71,3,stone);r(32,10,63,6,dark);
  for(let x=34;x<94;x+=7){r(x,11,5,3,'#8BC6D3');r(x,14,5,1,'#4F899E');}
  r(35,2,57,3,'#F6D9A0');r(45,3,37,1,'#E58938');
  for(const x of [33,91]){r(x,18,2,10,stone);}
  // Video board, orange ribbon and entrance lettering in chunky pixels.
  r(51,22,26,11,dark);r(53,24,22,7,'#2C5984');r(57,26,3,3,'#F9B451');r(63,26,9,1,cream);
  r(39,63,49,5,'#2F6DA6');
  const letters=['111101111','101001010','111101110'];
  letters.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')r(55+x*2,64+y,1,1,'#FFE1A1');}));
  for(const x of [12,113]){r(x,7,2,27,'#9EA9A4');r(x-6,5,14,4,dark);for(let n=0;n<4;n++)r(x-5+n*3,6,2,2,cream);}
  flag(22,2);flag(104,2);
 }else if(id==='odome'){
  poly([[9,48],[24,33],[104,33],[121,48],[121,77],[102,87],[25,87],[9,76]],'#BBB7A7');r(15,49,98,28,cream);
  for(let y=0;y<32;y++){const half=Math.round(Math.sqrt(Math.max(0,1-((31-y)/32)**2))*55);r(64-half,18+y,half*2,1,y<8?'#FFF9E9':y<20?'#E7E6D7':'#C9D0C4');}
  for(const x of [25,44,64,84,103])poly([[64,18],[x,47],[x+2,47]],'#C3CDBE');r(10,48,110,4,stone);
  for(let x=18;x<112;x+=13){r(x,54,3,23,'#B0AEA0');r(x+4,58,7,13,glass);}r(51,64,27,19,dark);r(54,67,21,15,glass);r(63,67,2,15,stone);r(43,58,43,4,'#ED954A');flag(10,60);flag(116,60);
 }else if(id==='reitz'){
  poly([[10,35],[34,22],[111,24],[121,37],[121,79],[102,88],[10,80]],'#9E8063');r(10,36,92,44,stone);poly([[102,36],[121,26],[121,79],[102,88]],'#AF9675');
  poly([[8,34],[33,20],[121,24],[103,38]],'#DAE6DD');r(9,36,95,3,cream);
  r(17,43,78,26,glass);for(let x=18;x<94;x+=9)r(x,43,2,26,stone);for(const y of [51,60])r(17,y,78,2,stone);
  r(21,70,67,10,dark);for(let x=23;x<86;x+=8)r(x,71,6,9,'#87B9BC');r(2,73,30,9,brick);r(93,66,15,18,brick);
  r(6,41,7,33,cream);r(96,40,7,35,cream);r(42,29,28,5,'#F3984F');r(46,29,4,5,cream);r(54,29,11,2,cream);tree(109,61);
 }else if(id==='marston'){
  poly([[16,22],[35,12],[112,18],[112,79],[93,89],[16,81]],brickDark);r(16,24,78,56,brick);poly([[15,23],[34,12],[113,18],[94,29]],'#E0B38C');
  for(let y=32;y<72;y+=11){r(17,y,77,3,stone);r(23,y+3,65,5,dark);for(let x=27;x<90;x+=12)r(x,y+3,2,5,glass);}
  r(45,68,22,14,dark);r(48,70,16,12,glass);
 }else if(id==='west'){
  poly([[10,27],[32,15],[119,22],[119,77],[98,89],[10,81]],'#A68769');r(10,28,88,53,'#E0C9A4');poly([[9,26],[31,14],[120,21],[99,34]],'#B99074');
  for(let y=35;y<66;y+=10){r(13,y,82,5,dark);for(let x=15;x<94;x+=7)r(x,y,4,4,glass);r(12,y+6,84,2,stone);}
  for(const x of [17,34,51,68,85])r(x,31,3,45,cream);r(44,68,25,15,dark);r(47,69,19,13,glass);r(38,80,36,3,stone);r(34,83,44,3,stone);tree(108,61);
 }else if(id==='malachowsky'){
  poly([[14,24],[42,9],[119,20],[119,76],[91,91],[14,80]],'#7B939D');r(14,25,77,55,'#CAD4CD');poly([[14,24],[42,9],[119,20],[91,35]],'#E4E6DA');
  for(let y=30;y<73;y+=9)for(let x=18;x<88;x+=10){poly([[x,y],[x+8,y],[x+8,y+8]],'#90ADB1');poly([[x,y],[x+8,y+8],[x,y+8]],'#E3E7D8');r(x+1,y+1,2,5,'#506F83');}
  for(let y=28;y<76;y+=9)for(let x=96;x<118;x+=8)poly([[x,y],[x+6,y-3],[x+6,y+4],[x,y+7]],'#A8BAC0');r(22,71,61,10,dark);r(27,72,51,8,glass);r(13,80,79,3,stone);tree(2,63);
 }else if(id==='plaza'){
  poly([[4,53],[51,24],[124,47],[78,86]],'#83BF6D');poly([[49,24],[55,25],[82,84],[77,86]],'#F3DEAD');poly([[4,51],[8,48],[123,46],[124,50]],'#F3DEAD');
  for(const [x,y] of [[12,27],[38,17],[69,23],[96,31],[14,54],[91,58],[57,58]])tree(x,y);
  for(const [x,y] of [[36,58],[83,40]]){r(x,y,13,3,'#A56B44');r(x,y+4,13,2,'#805439');r(x+1,y+6,2,3,dark);r(x+10,y+6,2,3,dark);}
 }
 return {width,height,pixels};
}
export const campusLandmarkSprites=Object.fromEntries((Object.keys(landmarkNames) as LandmarkId[]).map(id=>[id,campusLandmarkArt(id)])) as Record<LandmarkId,ReturnType<typeof campusLandmarkArt>>;
