import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '@/lib/env';
import {eventQuery,readEvents} from '@/lib/events/read';

export const runtime='nodejs';
export async function GET(request:Request) {
  const config=getSupabaseConfig();
  if(!config)return Response.json({error:'Event storage is not configured.'},{status:503});
  const parsed=eventQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return Response.json({error:'Choose 1–8 days, a limit up to 200, and a nonnegative offset.'},{status:400});
  try {
    const db=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
    return Response.json(await readEvents(db,parsed.data),{headers:{'Cache-Control':'public, max-age=60'}});
  } catch {return Response.json({error:'Events are unavailable. Check the event-ingestion migration and try again.'},{status:503});}
}
