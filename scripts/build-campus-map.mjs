import fs from 'node:fs';
import {applyUfBuildingCatalog} from './uf-building-catalog.mjs';
import {buildGroundSurfaces} from './ground-surfaces.mjs';
import {inferBuildingGround,inferSurroundingGround} from './building-ground.mjs';

// One cached OpenStreetMap snapshot; no live Overpass traffic from app clients.
const bounds = { north: 29.657, south: 29.6205, west: -82.375, east: -82.333 };
const groundPath='public/uf-ground-surfaces.json';
const surfaces=fs.existsSync(groundPath)?buildGroundSurfaces(JSON.parse(fs.readFileSync(groundPath,'utf8')),bounds):[];
const size = 1280;
const units = 4;
const sourcePath = 'public/uf-campus-osm.json';
if (!fs.existsSync(sourcePath)) {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const query = `[out:json][timeout:60];(way[building](${bbox});relation[building](${bbox});way[highway](${bbox});way[natural=water](${bbox});way[natural=wood](${bbox});way[leisure=park](${bbox}););out geom;`;
  const response = await fetch(process.env.OSM_OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter', {
    method: 'POST', body: new URLSearchParams({ data: query }),
    headers: { 'User-Agent': 'Breadcrumb-campus-map-builder/0.1 (one-time UF map snapshot)' },
    signal: AbortSignal.timeout(90000),
  });
  if (response.ok) fs.writeFileSync(sourcePath, await response.text());
  else {
    console.log(`Overpass unavailable (${response.status}); trying the OSM map API.`);
    const map = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`, { signal: AbortSignal.timeout(45000) });
    if (!map.ok) throw new Error(`OpenStreetMap map download failed: ${map.status}`);
    const xml = await map.text(), nodes = new Map();
    const attribute = (text,key) => text.match(new RegExp(`${key}="([^"]*)"`))?.[1];
    for (const match of xml.matchAll(/<node\b([^>]+)>/g)) nodes.set(attribute(match[1],'id'), {lat:Number(attribute(match[1],'lat')),lon:Number(attribute(match[1],'lon'))});
    const elements = [];
    for (const match of xml.matchAll(/<way\b([^>]+)>([\s\S]*?)<\/way>/g)) {
      const tags = Object.fromEntries([...match[2].matchAll(/<tag\b([^>]+)\/>/g)].map(tag => [attribute(tag[1],'k'), attribute(tag[1],'v')?.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&apos;',"'")]));
      const geometry = [...match[2].matchAll(/<nd\b([^>]+)\/>/g)].map(nd=>nodes.get(attribute(nd[1],'ref'))).filter(Boolean);
      if (geometry.length && (tags.building || tags.highway || ['water','wood'].includes(tags.natural) || tags.leisure === 'park')) elements.push({type:'way',id:Number(attribute(match[1],'id')),tags,geometry});
    }
    fs.writeFileSync(sourcePath, JSON.stringify({elements,osm3s:{timestamp_osm_base:new Date().toISOString()}}));
  }
}
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const extrasPath='public/uf-campus-extra-osm.json';
if(!fs.existsSync(extrasPath)){
 const bbox=`${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
 const query=`[out:json][timeout:60];(way[leisure=stadium](${bbox});relation[leisure=stadium](${bbox});relation[natural=water](${bbox});way[leisure=pitch](${bbox}););out geom;`;
 const response=await fetch(process.env.OSM_OVERPASS_ENDPOINT||'https://overpass-api.de/api/interpreter',{method:'POST',body:new URLSearchParams({data:query}),headers:{'User-Agent':'Breadcrumb-campus-map-builder/0.1 (one-time UF map snapshot)'},signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Campus details download failed: '+response.status);
 fs.writeFileSync(extrasPath,await response.text());
}
const extras=JSON.parse(fs.readFileSync(extrasPath,'utf8'));
const combined=new Map([...source.elements,...extras.elements].map(e=>[e.type+e.id,e]));source.elements=[...combined.values()];
const catalogPath='public/uf-official-buildings.json';
if(fs.existsSync(catalogPath))source.elements=applyUfBuildingCatalog(source.elements,JSON.parse(fs.readFileSync(catalogPath,'utf8')));
const grid = new Uint8Array(size * size);
const project = point => [Math.round((point.lon - bounds.west) / (bounds.east - bounds.west) * size), Math.round((bounds.north - point.lat) / (bounds.north - bounds.south) * size)];
function pixel(x, y, color) { if (x >= 0 && x < size && y >= 0 && y < size) grid[y * size + x] = color; }
function polygon(points, color) {
  const start = Math.max(0, Math.min(...points.map(p => p[1])));
  const end = Math.min(size - 1, Math.max(...points.map(p => p[1])));
  for (let y = start; y <= end; y++) {
    const intersections = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [x1, y1] = points[i], [x2, y2] = points[j];
      if ((y1 > y) !== (y2 > y)) intersections.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) for (let x = Math.ceil(intersections[i]); x <= intersections[i + 1]; x++) pixel(x, y, color);
  }
}
function rings(members,role){
 const remaining=members.filter(m=>m.role===role&&m.geometry?.length).map(m=>[...m.geometry]);const result=[];
 const same=(a,b)=>a.lat===b.lat&&a.lon===b.lon;
 while(remaining.length){const ring=remaining.pop();let found=true;while(found&&!same(ring[0],ring.at(-1))){found=false;for(let i=0;i<remaining.length;i++){const segment=remaining[i];if(same(ring.at(-1),segment[0])){ring.push(...segment.slice(1));remaining.splice(i,1);found=true;break;}if(same(ring.at(-1),segment.at(-1))){ring.push(...segment.slice(0,-1).reverse());remaining.splice(i,1);found=true;break;}}}if(ring.length>=4&&same(ring[0],ring.at(-1)))result.push(ring);}return result;
}
const elements=source.elements.flatMap(e=>e.geometry?.length?[e]:e.type==='relation'?rings(e.members??[],'outer').map((geometry,i)=>({...e,id:e.id+'-'+i,geometry,holes:rings(e.members??[],'inner')})):[]);
for (const e of elements) if (e.tags?.natural === 'wood' || e.tags?.landuse === 'forest') polygon(e.geometry.map(project), 1);
for (const e of elements) if (e.tags?.leisure === 'park' || ['grass','meadow'].includes(e.tags?.landuse) || e.tags?.landcover === 'grass') polygon(e.geometry.map(project), 7);
for (const e of elements) if (e.tags?.natural === 'water') polygon(e.geometry.map(project), 2);
for(const e of elements)if(e.tags?.leisure==='pitch')polygon(e.geometry.map(project),6);

const colors = ['#A7CF7B', '#548B60', '#66B9D1', '#F4DFAB', '#C58B68', '#8C604A', '#79BA62', '#B1D58A'];
const paths = colors.map(() => '');
for (let y = 0; y < size; y++) for (let x = 0; x < size;) {
  const color = grid[y * size + x]; let end = x + 1;
  while (end < size && grid[y * size + end] === color) end++;
  if (color) paths[color] += `M${x/units} ${y/units}h${(end-x)/units}v${1/units}H${x/units}z`;
  x = end;
}
const labels = [];
const names = new Set();
for (const e of elements) {
  const name = e.tags?.name;
  if (name && !e.tags.building && e.tags.leisure !== 'stadium' && !names.has(name)) {
    const points = e.geometry.map(project);
    labels.push({ name: name.replace(/\s+/g,' ').trim(), x: points.reduce((n,p)=>n+p[0],0)/points.length/units, y: points.reduce((n,p)=>n+p[1],0)/points.length/units });
    names.add(name);
  }
}
const precise=point=>[+((point.lon-bounds.west)/(bounds.east-bounds.west)*320).toFixed(4),+((bounds.north-point.lat)/(bounds.north-bounds.south)*320).toFixed(4)];
const metersPerUnit=(bounds.north-bounds.south)*111320/320;
const buildings=elements.filter(e=>(e.tags?.building&&e.tags.building!=='no')||e.tags?.leisure==='stadium').map(e=>{
 const points=e.geometry.map(precise);
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const height=Number.parseFloat(e.tags.height)||Number.parseFloat(e.tags['building:levels'])*3.2||6.4;
 const rise=Math.min(90,height)/metersPerUnit*.6;
 const holes=(e.holes??[]).map(ring=>ring.map(precise));
 const path=points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y-rise}`).join('')+'Z'+holes.map(ring=>ring.map(([x,y],i)=>`${i?'L':'M'}${x} ${y-rise}`).join('')+'Z').join('');
 const wall=points.slice(1).map(([x,y],i)=>{const [px,py]=points[i];return `M${px} ${py}L${x} ${y}V${y-rise}L${px} ${py-rise}Z`;}).join('');
 const faces=points.slice(1).map(([x,y],i)=>{const [px,py]=points[i];return {path:`M${px} ${py}L${x} ${y}V${y-rise}L${px} ${py-rise}Z`,color:x<px?'#CD9672':'#9D6C56'};});
 let windows='';
 for(let i=1;i<points.length;i++){
  const [x,y]=points[i],[px,py]=points[i-1],length=Math.hypot(x-px,y-py)*metersPerUnit;
  if(x>=px||length<4)continue;
  for(let distance=2;distance<length-1;distance+=3.5)for(let floor=1.6;floor<height-1;floor+=3.2){
   const t=distance/length,wx=px+(x-px)*t,wy=py+(y-py)*t-floor/metersPerUnit*.6;
   const w=.85/metersPerUnit,h=1.2/metersPerUnit*.6;
   windows+=`M${wx.toFixed(4)} ${wy.toFixed(4)}h${w.toFixed(4)}v${h.toFixed(4)}h-${w.toFixed(4)}z`;
  }
 }
 const taggedRoof=(e.tags['roof:colour']??'').toLowerCase();
 let roof=/Norman|Century|Library|Hall/.test(e.tags.name??'')?'#C98B6E':e.tags.building==='parking'?'#A6A49A':/blue|0000ff/i.test(taggedRoof)?'#719EB5':/white|grey|gray|silver/.test(taggedRoof)?'#C8C2B4':/red|brown|orange/.test(taggedRoof)?'#AC806C':'#CFB490';
 const landmark=/^(Century Tower|Norman Hall|J. Wayne Reitz Union|Reitz Union|Marston Science Library|Library West|Ben Hill Griffin Stadium)$/.test(e.tags.name??'');
 let accents='';
 if(landmark){for(const face of faces)face.color=face.color==='#CD9672'?'#D4815D':'#A35747';roof=/Century/.test(e.tags.name)?'#F2D69F':/Norman/.test(e.tags.name)?'#A0779B':/Stadium/.test(e.tags.name)?'#EDAE55':'#C57C58';}
 if(e.tags.name==='Century Tower'){
  windows='';const left=Math.min(...xs),right=Math.max(...xs),front=Math.max(...ys);
  for(const t of [.3,.7]){const x=left+(right-left)*t,w=.09,h=rise*.78,y=front-rise+.2;accents+=`M${x} ${y}h${w}v${h}h-${w}z`;windows+=`M${x+.025} ${y+.04}h.035v${h-.08}h-.035z`;}
 }
 return {id:String(e.id),name:e.tags.name??e.tags.official_name??e.tags['addr:housename']??(e.tags.ref?`Building ${e.tags.ref}`:''),officialName:e.tags.official_name??null,buildingNumber:e.tags.ref??null,nameSource:e.tags.source??'OpenStreetMap',x:(Math.min(...xs)+Math.max(...xs))/2,y:Math.max(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys),rise,roof,path,wall,faces,windows,landmark,accents};
}).filter(b=>b.width>0&&b.height>0).sort((a,b)=>a.y-b.y);
const walkways=elements.filter(e=>e.tags?.highway&&['footway','path','pedestrian','steps','cycleway'].includes(e.tags.highway)&&e.tags.access!=='private'&&e.tags.foot!=='no').map(e=>{
 const points=e.geometry.map(precise);
 return {id:String(e.id),points,width:(Number.parseFloat(e.tags.width)||1.8)/metersPerUnit,path:points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')};
});
const roads=elements.filter(e=>e.tags?.highway&&!['footway','path','pedestrian','steps','cycleway'].includes(e.tags.highway)).map(e=>({id:String(e.id),width:(Number.parseFloat(e.tags.width)||Number.parseFloat(e.tags.lanes)*3.2||5.5)/metersPerUnit,path:e.geometry.map(precise).map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')}));
// Canopy illustrations are sampled inside mapped woods, not claimed individual trees.
const trees=[];
const inside=(x,y,ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const blocked=(x,y)=>buildings.some(b=>x>b.x-b.width/2-.25&&x<b.x+b.width/2+.25&&y>b.y-b.height-.25&&y<b.y+.25)||walkways.some(p=>p.points.slice(1).some((b,i)=>{const a=p.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<p.width/2+.25;}));
for(const e of elements.filter(e=>e.tags?.natural==='wood'||e.tags?.landuse==='forest')){
 const ring=e.geometry.map(precise),holes=(e.holes??[]).map(h=>h.map(precise));
 const minX=Math.max(0,Math.min(...ring.map(p=>p[0]))),maxX=Math.min(320,Math.max(...ring.map(p=>p[0]))),minY=Math.max(0,Math.min(...ring.map(p=>p[1]))),maxY=Math.min(320,Math.max(...ring.map(p=>p[1])));
 let index=0;for(let y=minY;y<maxY;y+=1.1)for(let x=minX;x<maxX;x+=1.1){const seed=Number.parseInt(String(e.id),10)+index++*7919;const tx=x+.15+(Math.sin(seed)*.5+.5)*.6,ty=y+.15+(Math.cos(seed)*.5+.5)*.6;if(!inside(tx,ty,ring)||holes.some(h=>inside(tx,ty,h))||blocked(tx,ty))continue;trees.push({id:`canopy-${e.id}-${index}`,x:+tx.toFixed(4),y:+ty.toFixed(4),variant:index%3});}
}
const ground=[...surfaces.filter(s=>s.material==='unknown'),...inferSurroundingGround(surfaces),...inferBuildingGround(surfaces,buildings),...surfaces.filter(s=>s.material!=='unknown')];
fs.writeFileSync('packages/shared/src/campus-map.json', JSON.stringify({ size:320, bounds, colors, paths, labels, buildings, walkways, roads, trees, surfaces:ground, metersPerUnit, attribution: '© OpenStreetMap contributors · ODbL 1.0', source: 'https://www.openstreetmap.org/copyright', snapshot: source.osm3s?.timestamp_osm_base ?? null }));
console.log(`Built pixel campus from ${elements.length} OpenStreetMap features; ${labels.length} labels; ${buildings.length} building footprints.`);
