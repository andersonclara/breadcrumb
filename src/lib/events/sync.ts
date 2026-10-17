import type {SupabaseClient} from '@supabase/supabase-js';
import {feedClient} from './http.ts';
import {parseFeed} from './parsers.ts';
import {sources,sourceUrl,type Source} from './sources.ts';
import {dbError,saveEvents} from './store.ts';
import type {EventInput} from './model.ts';
import {instant,localDay} from './model.ts';

export type SyncResult = {source:string;status:string;fetched:number;saved:number;review:number;error?:string;capReached?:boolean};
export function enabledSources() {
  const ids = (process.env.EVENT_SYNC_SOURCES ?? 'gatorconnect,uf-calendar,libraries,arts,gatornights').split(',').map(s=>s.trim()).filter(Boolean);
  for (const id of ids) if (!sources.some(s=>s.id===id)) throw new Error('unknown_event_source');
  return sources.filter(s=>ids.includes(s.id));
}
export async function syncSources(db:SupabaseClient, options:{selected?:Source[];force?:boolean;now?:Date;fetcher?:typeof fetch} = {}) {
  const selected = options.selected ?? enabledSources(); const now = options.now ?? new Date();
  const deadline=Date.now()+240000;
  const get = feedClient([...new Set(selected.map(s=>new URL(s.url).origin))],options.fetcher,deadline);
  const results:SyncResult[] = [];
  for (const source of selected) {
    if(Date.now()+30000>deadline){results.push({source:source.id,status:'deferred',fetched:0,saved:0,review:0});continue;}
    const {data:token,error:leaseError} = await db.rpc('claim_event_sync',{p_source:source.id,p_force:options.force ?? false});
    dbError(leaseError);
    if (!token) { results.push({source:source.id,status:'not_due_or_running',fetched:0,saved:0,review:0}); continue; }
    const result:SyncResult = {source:source.id,status:'running',fetched:0,saved:0,review:0};
    let runId:string|null = null; let etag:string|null = null; let modified:string|null = null; let cacheSeconds = 0;
    try {
      const {data:run,error:runError} = await db.from('event_ingestion_runs').insert({source:source.id}).select('id').single();
      dbError(runError); if (!run) throw new Error('database_missing_run'); runId = run.id;
      const paginated = ['livewhale','tribe'].includes(source.format);
      const {data:state,error:stateError} = await db.from('event_source_state').select('etag,last_modified').eq('source',source.id).single();
      dbError(stateError);
      const inputs:EventInput[] = [];
      for (let page=1;page<=6;page++) {
        const response = await get(sourceUrl(source,now,page),paginated || options.force ? {} : {etag:state?.etag,modified:state?.last_modified});
        etag = response.etag ?? state?.etag ?? null; modified = response.modified ?? state?.last_modified ?? null;
        cacheSeconds = Math.max(cacheSeconds,response.cacheSeconds);
        if (response.status===304) {result.status='not_modified';break;}
        const parsed = parseFeed(response.body,source);
        inputs.push(...parsed.events);
        if (!parsed.hasNext) break;
        if (page===6) result.capReached=true;
      }
      result.fetched = inputs.length;
      Object.assign(result,await saveEvents(db,source.id,inputs,now));
      // Only a complete, explicitly windowed feed can retire an absent occurrence.
      // Preserve the row for review rather than inventing a cancellation.
      if(paginated && !result.capReached && inputs.length) {
        const {error}=await db.from('club_events').update({ingestion_status:'needs_review',review_reasons:['no_longer_in_source_window']})
          .eq('source',source.id).gte('starts_at',instant(`${localDay(now)}T00:00:00`,'America/New_York')!)
          .lte('starts_at',new Date(now.getTime()+7*86400000).toISOString()).lt('last_synced_at',now.toISOString());
        dbError(error);
      }
      if (result.status!=='not_modified') result.status=result.capReached ? 'partial' : 'succeeded';
    } catch (error) {
      result.status='failed';
      result.error=error instanceof Error && /^[a-z0-9_]+$/i.test(error.message) ? error.message : 'source_sync_failed';
    } finally {
      const success=['succeeded','partial','not_modified'].includes(result.status);
      const {error:releaseError} = await db.rpc('release_event_sync',{
        p_source:source.id,p_token:token,p_delay_seconds:success?Math.max(source.intervalMinutes*60,cacheSeconds):1800,
        p_success:success,p_etag:etag,p_modified:modified,
      });
      dbError(releaseError);
      if (runId) {
        const {error} = await db.from('event_ingestion_runs').update({status:result.status,finished_at:new Date().toISOString(),
          fetched:result.fetched,saved:result.saved,review:result.review,error_code:result.error ?? null,details:{capReached:result.capReached ?? false}}).eq('id',runId);
        dbError(error);
      }
    }
    results.push(result);
  }
  return results;
}
