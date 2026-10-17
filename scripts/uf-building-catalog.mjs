// Merge UF's public footprint catalog into the cached OSM terrain snapshot.
// Official outlines/names take priority; OSM can supply recorded building heights.
export function applyUfBuildingCatalog(elements,catalog){
 const box=points=>({left:Math.min(...points.map(p=>p.lon)),right:Math.max(...points.map(p=>p.lon)),bottom:Math.min(...points.map(p=>p.lat)),top:Math.max(...points.map(p=>p.lat))});
 const area=b=>(b.right-b.left)*(b.top-b.bottom);
 const osm=elements.filter(e=>e.tags?.building).map(e=>({e,points:e.geometry??e.members?.filter(m=>m.role==='outer').flatMap(m=>m.geometry??[])??[]})).filter(e=>e.points.length).map(({e,points})=>({e,b:box(points)}));
 const removed=new Set(),official=[];
 for(const f of catalog.features){
  const a=f.attributes,rings=f.geometry?.rings;if(!rings?.length)continue;
  // UF's stadium record outlines a stand; retain OSM's complete bowl perimeter.
  if(/Ben Hill Griffin\s+Stadium/i.test(a.GroundName??''))continue;
  const polygons=rings.map(r=>r.map(([lon,lat])=>({lon,lat}))).sort((a,b)=>area(box(b))-area(box(a)));
  const geometry=polygons[0],bounds=box(geometry);
  const matches=osm.map(item=>{const b=item.b,intersection=Math.max(0,Math.min(b.right,bounds.right)-Math.max(b.left,bounds.left))*Math.max(0,Math.min(b.top,bounds.top)-Math.max(b.bottom,bounds.bottom));return {...item,overlap:intersection/Math.max(1e-15,Math.min(area(b),area(bounds)))};}).filter(m=>m.overlap>.55).sort((a,b)=>b.overlap-a.overlap);
  for(const m of matches)removed.add(m.e);
  const tags=matches[0]?.e.tags??{};
  const name=String(a.GroundName??'').replace(/\s+/g,' ').trim();
  official.push({type:'way',id:`uf-${a.OBJECTID}`,geometry,holes:polygons.slice(1),tags:{...tags,building:tags.building||'yes',name:name||(a.GroundNum?`UF Building ${a.GroundNum}`:''),official_name:name,ref:a.GroundNum,source:'UF public building catalog'}});
 }
 return [...elements.filter(e=>!removed.has(e)),...official];
}
