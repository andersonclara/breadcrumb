import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import {dbError} from './store.ts';
import {fingerprint} from './model.ts';

export const eventQuery=z.object({
  days:z.coerce.number().int().min(1).max(8).default(7),
  limit:z.coerce.number().int().min(1).max(200).default(100),
  offset:z.coerce.number().int().min(0).max(10000).default(0),
});
export async function readEvents(db:SupabaseClient,query:z.infer<typeof eventQuery>,now=new Date()) {
  const end=new Date(now.getTime()+query.days*86400000);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const {data,error}=await db.from('club_events').select('id,source,source_id,title,club,venue_text,starts_at,ends_at,event_date,all_day,url,price_text,tags,last_synced_at')
    .eq('ingestion_status','published').or(`ends_at.gt.${now.toISOString()},starts_at.gte.${now.toISOString()},event_date.eq.${today}`).lte('starts_at',end.toISOString())
    .order('starts_at').order('id').range(query.offset,query.offset+query.limit-1);
  dbError(error);
  const seen=new Set<string>();
  const events=(data ?? []).filter(e=>{
    // Unknown end does not mean "happening now"; show upcoming starts only.
    if(!e.all_day && Date.parse(e.ends_at ?? e.starts_at)<=now.getTime())return false;
    if(e.all_day && (e.event_date ?? e.starts_at.slice(0,10))<today && (!e.ends_at || Date.parse(e.ends_at)<=now.getTime()))return false;
    // Conservative display grouping only. Keep originals/provenance in storage.
    const key=fingerprint([e.title.toLowerCase().replace(/[^a-z0-9]/g,''),e.starts_at,e.venue_text?.toLowerCase()]);
    if(seen.has(key))return false;seen.add(key);return true;
  }).map(e=>({...e,kind:'scheduled',community_confirmed:false}));
  return {events,window:{from:now.toISOString(),to:end.toISOString()},nextOffset:data?.length===query.limit ? query.offset+query.limit : null};
}
