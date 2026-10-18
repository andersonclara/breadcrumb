import nextEnv from '@next/env';
import {readFile} from 'node:fs/promises';
import {eventAdmin,dbError} from '../src/lib/events/store.ts';
import {sources,sourceUrl,unavailableSources,instagramAccounts} from '../src/lib/events/sources.ts';
import {syncSources,enabledSources} from '../src/lib/events/sync.ts';
import {feedClient} from '../src/lib/events/http.ts';
import {parseFeed} from '../src/lib/events/parsers.ts';
import {normalizeEvent} from '../src/lib/events/model.ts';
import {extractInstagram} from '../src/lib/events/extract.ts';

nextEnv.loadEnvConfig(process.cwd());
const [command,...args]=process.argv.slice(2);
try {
  if(command==='status') {
    console.log(JSON.stringify({
      configuration:Object.fromEntries(['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','CRON_SECRET','APIFY_API_TOKEN','GEMINI_API_KEY','GEMINI_MODEL'].map(k=>[k,Boolean(process.env[k])])),
      scheduledSyncEnabled:process.env.EVENT_SYNC_ENABLED==='1',sources:enabledSources(),instagram:{mode:'manual',accounts:instagramAccounts.length,totalPosts:150,maxApifyUsd:5},unavailableSources,
    },null,2));
    if(process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const db=eventAdmin();
      const {count,error:postError}=await db.from('event_source_records').select('source_id',{count:'exact'}).eq('source','instagram').limit(0);dbError(postError);
      console.log(JSON.stringify({instagramStoredPosts:count}));
      for(const table of ['event_source_state','event_ingestion_runs']) {
        const {data,error}=await db.from(table).select('*').limit(20);dbError(error);
        console.log(JSON.stringify({table,rows:data},null,2));
      }
    }
    try {
      const manifest=JSON.parse(await readFile(new URL('../data/ingestion/instagram-bootstrap.json',import.meta.url),'utf8'));
      console.log(JSON.stringify({instagramBootstrap:manifest.batches.map(b=>({status:b.status,usageUsd:b.usageUsd ?? null})),
        observedApifyRunCostUsd:manifest.batches.reduce((sum,b)=>sum+(b.usageUsd ?? 0),0)}));
    }catch{/* No local bootstrap checkpoint in a new checkout or deployed runner. */}
  } else if(command==='preview') {
    const selected=args.filter(a=>!a.startsWith('--'));
    for(const id of selected.length?selected:['gatorconnect']) {
      const source=sources.find(s=>s.id===id);if(!source)throw new Error('unknown_event_source');
      const get=feedClient([new URL(source.url).origin]);const now=new Date();
      const result=await get(sourceUrl(source,now));const parsed=parseFeed(result.body,source);
      const rows=parsed.events.map(e=>normalizeEvent(e,source.id,now));
      console.log(JSON.stringify({source:id,count:rows.length,published:rows.filter(r=>r.event?.ingestion_status==='published').length,needsReview:rows.filter(r=>!r.event||r.event.ingestion_status==='needs_review').length,
        hasMorePages:parsed.hasNext,samples:rows.slice(0,3).map(r=>({title:r.event?.title,starts_at:r.event?.starts_at,all_day:r.event?.all_day,url:r.event?.url,issues:r.issues}))},null,2));
    }
  } else if(command==='sync') {
    const ids=args.filter(a=>!a.startsWith('--'));
    for(const id of ids)if(!sources.some(s=>s.id===id))throw new Error('unknown_event_source');
    const results=await syncSources(eventAdmin(),{selected:ids.length?sources.filter(s=>ids.includes(s.id)):undefined,force:args.includes('--force')});
    console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='failed'))process.exitCode=1;
  } else if(command==='extract') {
    const limit=Number(args.find(a=>/^\d+$/.test(a)) ?? 10);
    const modelIndex=args.indexOf('--model');const model=modelIndex>=0?args[modelIndex+1]:undefined;
    if(modelIndex>=0&&!model)throw new Error('model_name_required');
    console.log(JSON.stringify(await extractInstagram(eventAdmin(),{limit,images:args.includes('--images'),model,onProgress:progress=>console.log(JSON.stringify(progress))})));
  } else if(command==='review') {
    const db=eventAdmin();const id=args.find(a=>/^[a-f0-9-]{36}$/i.test(a));
    if(args.includes('--approve')) {
      if(!id || !/^[a-f0-9-]{36}$/i.test(id))throw new Error('event_uuid_required');
      const {data:event,error}=await db.from('club_events').select('source,source_id,review_reasons,ingestion_status').eq('id',id).single();dbError(error);
      if(!event || event.ingestion_status!=='needs_review' || event.review_reasons.some(r=>r!=='ai_extraction_requires_review'))throw new Error('resolve_event_issues_before_approval');
      const {error:saveError}=await db.from('club_events').update({ingestion_status:'published',review_reasons:[]}).eq('id',id).eq('ingestion_status','needs_review');dbError(saveError);
      console.log(JSON.stringify({approved:id}));
    } else {
      let query=db.from('club_events').select('id,source,title,starts_at,ends_at,venue_text,url,review_reasons').eq('ingestion_status','needs_review');
      const sourceIndex=args.indexOf('--source');
      if(sourceIndex>=0){const source=args[sourceIndex+1];if(!source || !['instagram',...sources.map(s=>s.id)].includes(source))throw new Error('unknown_event_source');query=query.eq('source',source);}
      if(!args.includes('--all'))query=query.gte('starts_at',new Date(Date.now()-86400000).toISOString()).lte('starts_at',new Date(Date.now()+8*86400000).toISOString());
      const {data,error}=await query.order('starts_at').limit(100);dbError(error);
      console.log(JSON.stringify(data,null,2));
    }
  } else {
    console.log('Usage: npm run events:status | events:preview -- [source...] | events:sync -- [source...] [--force] | events:extract -- [limit=10] [--images] | events:review -- [event-uuid --approve]');
  }
} catch(error) {
  // Never dump provider exceptions, request URLs containing tokens, or env values.
  console.error(error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)?error.message:'event_command_failed');process.exitCode=1;
  if(error?.cause?.providerMessage)console.error(JSON.stringify({providerMessage:error.cause.providerMessage}));
}
