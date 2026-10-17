import nextEnv from '@next/env';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {instagramPlan,apifyClient,storeInstagram} from '../src/lib/events/instagram.ts';
import {eventAdmin,dbError} from '../src/lib/events/store.ts';

nextEnv.loadEnvConfig(process.cwd());
const args=process.argv.slice(2);
const folder=new URL('../data/ingestion/',import.meta.url);
const file=new URL('instagram-bootstrap.json',folder);
async function save(manifest) {
  const temp=new URL('instagram-bootstrap.tmp',folder);
  await writeFile(temp,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});await rename(temp,file);
}
try {
  if(args.includes('--plan')) {console.log(JSON.stringify({batches:instagramPlan(),totalPosts:150,maxApifyUsd:5,schedule:'manual only'},null,2));}
  else if(args.includes('--file')) {
    const path=args[args.indexOf('--file')+1];if(!path)throw new Error('export_file_required');
    const items=JSON.parse(await readFile(path,'utf8'));if(!Array.isArray(items) || items.length>5000)throw new Error('invalid_dataset_export');
    console.log(JSON.stringify(await storeInstagram(eventAdmin(),items)));
  } else if(args.includes('--start') || args.includes('--resume')) {
    // Verify storage/migration before any potentially billable provider request.
    const db=eventAdmin();const {error}=await db.from('event_source_records').select('source_id').limit(1);dbError(error);
    const apify=apifyClient(process.env.APIFY_API_TOKEN ?? '');
    let manifest;
    if(args.includes('--start')) {
      await mkdir(folder,{recursive:true});
      manifest={createdAt:new Date().toISOString(),maxApifyUsd:5,batches:instagramPlan().map(p=>({...p,status:'planned'}))};
      // Exclusive creation prevents accidental reruns/spend. Resume existing runs.
      await writeFile(file,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
    } else manifest=JSON.parse(await readFile(file,'utf8'));
    const expected=instagramPlan();
    if(manifest.maxApifyUsd!==5 || manifest.batches.length!==expected.length || manifest.batches.some((batch,i)=>
      batch.maxUsd!==expected[i].maxUsd || batch.maxItems!==expected[i].maxItems || batch.perAccount!==expected[i].perAccount || JSON.stringify(batch.accounts)!==JSON.stringify(expected[i].accounts)))throw new Error('invalid_bootstrap_budget_or_accounts');
    // A second local process must not start another paid batch during resume.
    const lock=new URL('instagram-bootstrap.lock',folder);
    await writeFile(lock,String(process.pid),{flag:'wx',mode:0o600});
    try {
      for(const batch of manifest.batches) {
        if(batch.status==='imported')continue;
        if(batch.status==='starting')throw new Error('run_start_uncertain_check_apify_console_before_retry');
        if(batch.status==='planned') {
          batch.status='starting';await save(manifest);
          const query=new URLSearchParams({maxTotalChargeUsd:String(batch.maxUsd),maxItems:String(batch.maxItems),timeout:'300',restartOnError:'false'});
          const response=await apify(`/v2/acts/apify~instagram-scraper/runs?${query}`,{method:'POST',body:JSON.stringify({
            directUrls:batch.accounts.map(a=>`https://www.instagram.com/${a}/`),resultsType:'posts',resultsLimit:batch.perAccount,addParentData:false,
          })});
          const run=response.data;if(!run?.id)throw new Error('apify_missing_run_id');
          batch.runId=run.id;batch.status=run.status;await save(manifest);
        }
        const {data:run}=await apify(`/v2/actor-runs/${encodeURIComponent(batch.runId)}`);
        batch.status=run.status;batch.usageUsd=run.usageTotalUsd;await save(manifest);
        if(!['SUCCEEDED','FAILED','ABORTED','TIMED-OUT'].includes(run.status)) {
          console.log(JSON.stringify({status:run.status,runId:batch.runId,next:'Run npm run events:instagram -- --resume; it will reuse this run.'}));break;
        }
        if(!run.defaultDatasetId)throw new Error('apify_missing_dataset');
        const items=await apify(`/v2/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&format=json&limit=${batch.maxItems}`);
        const result=await storeInstagram(db,items);
        if(run.status!=='SUCCEEDED') {
          batch.partialImport=result;await save(manifest);
          console.log(JSON.stringify({runId:batch.runId,status:run.status,...result,next:'Partial results saved; no replacement paid run was started.'}));break;
        }
        batch.providerStatus=run.status;batch.status='imported';batch.import=result;await save(manifest);
        console.log(JSON.stringify({runId:batch.runId,status:'imported',...result}));
      }
    } finally {const {unlink}=await import('node:fs/promises');await unlink(lock);}
  } else console.log('Usage: npm run events:instagram -- --plan | --start | --resume | --file path-to-export.json');
} catch(error) {
  console.error(error?.code==='EEXIST'?'bootstrap_manifest_or_lock_exists_use_resume':error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)?error.message:'instagram_import_failed');process.exitCode=1;
}
