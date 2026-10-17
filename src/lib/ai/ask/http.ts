import 'server-only';
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import type {SupabaseClient} from '@supabase/supabase-js';

export async function readAskBody(request:Request) {
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new Response('Use application/json',{status:415});
  if(Number(request.headers.get('content-length'))>16384)throw new Response('Request is too large',{status:413});
  const reader=request.body?.getReader();if(!reader)throw new Response('Invalid request',{status:400});
  let size=0;const chunks:Uint8Array[]=[];
  try {
    while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>16384){await reader.cancel();throw new Response('Request is too large',{status:413});}chunks.push(value);}
  } finally {reader.releaseLock();}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch {throw new Response('Invalid JSON',{status:400});}
}
export function quotaKey(request:Request,secret:string,trustedHeader=process.env.ASK_TRUSTED_IP_HEADER) {
  // Only configure a header that the deployment proxy OVERWRITES, never one
  // forwarded verbatim from the public caller. Local/default traffic shares a cap.
  const ip=trustedHeader?request.headers.get(trustedHeader)?.trim():undefined;
  const identity=ip&&isIP(ip)?ip:'shared-public';
  return createHmac('sha256',secret).update(identity).digest('hex');
}
export async function takeQuota(db:SupabaseClient,request:Request,signal:AbortSignal) {
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)throw new Error('ask_quota_unconfigured');
  const {data,error}=await db.rpc('ask_take_quota',{p_key:quotaKey(request,secret)}).abortSignal(signal);
  if(error)throw new Error('ask_quota_unavailable');
  if(data!==true)throw new Response('Please wait before asking again.',{status:429,headers:{'Retry-After':'60'}});
}
