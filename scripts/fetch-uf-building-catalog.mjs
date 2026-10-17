import fs from 'node:fs';
const source='https://services9.arcgis.com/IiuFUnlkob76Az9k/ArcGIS/rest/services/UF_Building_and_Greek_Footprints_view/FeatureServer/0/query';
const features=[];
for(let offset=0;;offset+=1000){
 const params=new URLSearchParams({f:'json',where:'1=1',geometry:'-82.375,29.6205,-82.333,29.657',geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',outSR:'4326',outFields:'OBJECTID,GroundName,GroundNum,GroundType,GroundSubType,GroundMaterial',returnGeometry:'true',orderByFields:'OBJECTID',resultOffset:String(offset),resultRecordCount:'1000'});
 const response=await fetch(`${source}?${params}`,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`UF building catalog: ${response.status}`);
 const data=await response.json();if(data.error)throw Error(JSON.stringify(data.error));
 features.push(...data.features);if(!data.exceededTransferLimit)break;
}
fs.writeFileSync('public/uf-official-buildings.json',JSON.stringify({source,fetchedAt:new Date().toISOString(),features}));
console.log(`Cached ${features.length} UF footprint records. Run node scripts/build-campus-map.mjs to rebuild.`);
