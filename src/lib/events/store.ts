import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {fingerprint,normalizeEvent,text,type EventInput} from './model.ts';

// Server/Node CLI module. Never import into browser or native client components.

export function eventAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing_supabase_server_config');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function dbError(error: {code?:string} | null) { if (error) throw new Error(`database_${error.code ?? 'unavailable'}`); }
export async function saveEvents(db: SupabaseClient, source: string, inputs: EventInput[], now: Date) {
  let review = 0;
  // One record per source ID; retries update instead of creating duplicates.
  const unique = [...new Map(inputs.map(e => [e.id,e])).values()];
  const prepared = unique.map(input => {
    const normalized = normalizeEvent(input,source,now);
    const event = normalized.event;
    // Save date conflicts/missing fields privately for review, not as fake events.
    const staging = {source,source_id:input.id,source_url:input.url,content_hash:fingerprint(input),
      payload:{...input,description:text(input.description,8000)||null},extraction:{issues:normalized.issues},
      processing_status:event && event.ingestion_status === 'published' ? 'processed' : 'needs_review',fetched_at:now.toISOString()};
    if (!event || event.ingestion_status === 'needs_review') review++;
    return {staging,event,input};
  });
  for (let i=0;i<prepared.length;i+=100) {
    const batch = prepared.slice(i,i+100);
    const {error:stageError} = await db.from('event_source_records').upsert(batch.map(r=>r.staging),{onConflict:'source,source_id'});
    dbError(stageError);
    const events = batch.flatMap(r=>r.event ? [r.event] : []);
    if (events.length) {
      const {error} = await db.from('club_events').upsert(events,{onConflict:'source,source_id'});
      dbError(error);
    }
    // If a formerly published event becomes unparseable, stop serving old details.
    const invalid = batch.filter(r=>!r.event).map(r=>r.input.id);
    if (invalid.length) {
      const {error} = await db.from('club_events').update({ingestion_status:'needs_review',review_reasons:['upstream_details_unresolved']}).eq('source',source).in('source_id',invalid);
      dbError(error);
    }
  }
  return {saved:prepared.filter(r=>r.event).length,review};
}
