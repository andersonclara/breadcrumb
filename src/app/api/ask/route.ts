import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '@/lib/env';
import {createAdminClient} from '@/lib/supabase/admin';
import {askRequestSchema} from '@/lib/ai/ask/schema';
import {ask} from '@/lib/ai/ask/agent';
import {interpret,explain} from '@/lib/ai/ask/model';
import {getAskModelConfig} from '@/lib/ai/ask/provider';
import {createSearch} from '@/lib/ai/ask/search';
import {readAskBody,takeQuota} from '@/lib/ai/ask/http';
import {allowedApiOrigin,mobileApi,mobileOptions} from '@/lib/mobile-api';

export const runtime='nodejs';
export const maxDuration=30;
async function post(request:Request) {
  const headers={'Cache-Control':'private, no-store'};
  try {
    if(!allowedApiOrigin(request))return Response.json({error:'Invalid request origin'},{status:403,headers});
    const parsed=askRequestSchema.safeParse(await readAskBody(request));
    if(!parsed.success)return Response.json({error:'Check your message and search context.'},{status:400,headers});
    const config=getSupabaseConfig();
    if(!config||!getAskModelConfig()||!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return Response.json({error:'Ask Breadcrumb is not configured yet.'},{status:503,headers});
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(25000)]);
    await takeQuota(createAdminClient(),request,signal);
    // Public discovery deliberately uses a fresh anonymous client. Never send
    // pixel_world profiles/friends/presence or private community posts to AI.
    const db=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
    const search=createSearch(db,signal);
    return Response.json(await ask(parsed.data,{interpret,explain,...search},signal),{headers});
  } catch(error) {
    if(error instanceof Response)return Response.json({error:await error.text()},{status:error.status,headers:{...headers,...Object.fromEntries(error.headers)}});
    return Response.json({error:'Ask Breadcrumb is temporarily unavailable. Please try again.'},{status:503,headers});
  }
}
export const POST=mobileApi(post);
export const OPTIONS=mobileOptions;
