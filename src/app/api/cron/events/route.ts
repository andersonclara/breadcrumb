import {validCron} from '@/lib/events/cron';
import {eventAdmin} from '@/lib/events/store';
import {syncSources} from '@/lib/events/sync';

export const runtime='nodejs';
export const maxDuration=300;
export async function GET(request:Request) {
  if(!validCron(request))return Response.json({error:'Unauthorized'},{status:401});
  if(process.env.EVENT_SYNC_ENABLED!=='1')return Response.json({status:'disabled'},{headers:{'Cache-Control':'no-store'}});
  try {
    const results=await syncSources(eventAdmin());
    return Response.json({results},{status:results.some(r=>r.status==='failed')?207:200,headers:{'Cache-Control':'no-store'}});
  } catch {return Response.json({error:'Event sync could not complete. Check server configuration and ingestion logs.'},{status:503});}
}
