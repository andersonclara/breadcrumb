import fs from 'node:fs';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
const source='https://tiles.arcgis.com/tiles/IiuFUnlkob76Az9k/arcgis/rest/services/UFColorBasemapStandard/VectorTileServer';
const z=16,n=2**z;
const tileX=lon=>Math.floor((lon+180)/360*n);
const tileY=lat=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
const layers={
 'Landscape Base':['grass','woodland','water','planter','turf','grass','unknown'],
 'Fields':['grass','turf','sand','concrete'],
 'Roads and Parking Lots':['asphalt','brick','concrete','gravel'],
 'Paths and Courtyards':['brick','asphalt','concrete','concrete','concrete','wood'],
 'Steps and Ramps':['concrete','wood','concrete','brick'],
};
const tiles=[];
for(let y=tileY(29.657);y<=tileY(29.6205);y++)for(let x=tileX(-82.375);x<=tileX(-82.333);x++)tiles.push({x,y});
const features=[];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<tiles.length){const {x,y}=tiles[cursor++],response=await fetch(`${source}/tile/${z}/${y}/${x}.pbf`,{signal:AbortSignal.timeout(30000)});
  if(response.status===204||response.status===404)continue;
  if(!response.ok)throw Error(`UF tile ${x}/${y}: ${response.status}`);
  const tile=new VectorTile(new PbfReader(new Uint8Array(await response.arrayBuffer())));
  for(const [name,materials] of Object.entries(layers)){
   const layer=tile.layers[name];if(!layer)continue;
   for(let i=0;i<layer.length;i++){
    const f=layer.feature(i);if(f.type!==3)continue;
    const material=materials[Number(f.properties._symbol)]??'unknown';
    const geometry=f.toGeoJSON(x,y,z).geometry;
    // Tile buffers overlap. Preserve the clip box for deterministic build-time clipping.
    const lon=tx=>tx/n*360-180,lat=ty=>Math.atan(Math.sinh(Math.PI*(1-2*ty/n)))*180/Math.PI;
    features.push({id:`${name}-${x}-${y}-${i}`,layer:name,material,geometry,clip:[lon(x),lat(y+1),lon(x+1),lat(y)]});
   }
  }
 }
}));
features.sort((a,b)=>a.id.localeCompare(b.id));
fs.writeFileSync('public/uf-ground-surfaces.json',JSON.stringify({source,fetchedAt:new Date().toISOString(),zoom:z,features}));
console.log(`Cached ${features.length} surface polygons from ${tiles.length} UF tiles.`);
console.log(features.reduce((counts,f)=>(counts[f.material]=(counts[f.material]??0)+1,counts),{}));
