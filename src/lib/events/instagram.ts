import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import {boundedText} from './http.ts';
import {fingerprint,publicUrl} from './model.ts';
import {instagramAccounts} from './sources.ts';
import {dbError} from './store.ts';

export const INSTAGRAM_LIMIT=150;
export const INSTAGRAM_BUDGET=5;
export function instagramPlan() {
  // 22 accounts * 5 + 10 accounts * 4 = exactly 150 requested posts total.
  return [
    {accounts:instagramAccounts.slice(0,22),perAccount:5,maxItems:110,maxUsd:3.67},
    {accounts:instagramAccounts.slice(22),perAccount:4,maxItems:40,maxUsd:1.33},
  ];
}
const rawPost=z.object({
  id:z.union([z.string(),z.number()]).optional(),shortCode:z.string().optional(),url:z.string().optional(),
  inputUrl:z.string().optional(),
  ownerUsername:z.string(),caption:z.string().optional(),timestamp:z.string().optional(),
  type:z.string().optional(),isPinned:z.boolean().optional(),displayUrl:z.string().optional(),
  images:z.array(z.string()).optional(),childPosts:z.array(z.object({displayUrl:z.string().optional()})).optional(),
});
export function normalizePosts(items:unknown[]) {
  const posts = new Map<string,{
    source:string;source_id:string;source_url:string;account_handle:string;posted_at:string|null;
    content_hash:string;payload:{caption:string;media_urls:string[];media_type:string;is_pinned:boolean;original_account_handle?:string};fetched_at:string;
  }>();
  for (const item of items) {
    const parsed=rawPost.safeParse(item); if(!parsed.success) continue;
    const p=parsed.data; const owner=p.ownerUsername.toLowerCase().replace(/^@/,'');
    let handle=owner;
    if (!(instagramAccounts as readonly string[]).includes(owner)) {
      const inputUrl=publicUrl(p.inputUrl);
      if(!inputUrl)continue;
      const input=new URL(inputUrl);const profile=input.pathname.match(/^\/([a-z0-9._]+)\/?$/i)?.[1]?.toLowerCase();
      if(!['instagram.com','www.instagram.com'].includes(input.hostname) || !profile || !(instagramAccounts as readonly string[]).includes(profile))continue;
      // Collaborations/reposts can belong to another author while appearing in a
      // requested organization's feed. Keep both provenance identities privately.
      handle=profile;
    }
    const id=String(p.id ?? p.shortCode ?? '');
    const url=publicUrl(p.url ?? (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null));
    if(!id || !url || !['www.instagram.com','instagram.com'].includes(new URL(url).hostname)) continue;
    const urls=[p.displayUrl,...(p.images ?? []),...(p.childPosts ?? []).map(c=>c.displayUrl)].filter((u):u is string=>Boolean(u));
    const media_urls=[...new Set(urls.map(u=>publicUrl(u)).filter((u):u is string=>Boolean(u)))].slice(0,10);
    const payload={caption:(p.caption ?? '').slice(0,12000),media_urls,media_type:p.type ?? 'unknown',is_pinned:p.isPinned ?? false,
      ...(owner!==handle?{original_account_handle:owner}:{})};
    const posted_at=p.timestamp && Number.isFinite(Date.parse(p.timestamp)) ? new Date(p.timestamp).toISOString() : null;
    posts.set(id,{source:'instagram',source_id:id,source_url:url,account_handle:handle,posted_at,
      content_hash:fingerprint(payload),payload,fetched_at:new Date().toISOString()});
  }
  return [...posts.values()].sort((a,b)=>(b.posted_at ?? '').localeCompare(a.posted_at ?? '')).slice(0,INSTAGRAM_LIMIT);
}
export async function storeInstagram(db:SupabaseClient,items:unknown[]) {
  const posts=normalizePosts(items);
  if (!posts.length) return {saved:0,unchanged:0};
  const {data:old,error:readError}=await db.from('event_source_records').select('source_id,content_hash').eq('source','instagram').in('source_id',posts.map(p=>p.source_id));
  dbError(readError);
  const hashes=new Map((old ?? []).map(p=>[p.source_id,p.content_hash]));
  const changed=posts.filter(p=>hashes.get(p.source_id)!==p.content_hash);
  if (changed.length) {
    const {error}=await db.from('event_source_records').upsert(changed.map(p=>({...p,processing_status:'pending',extraction:null})),{onConflict:'source,source_id'});
    dbError(error);
    // Changed announcements need extraction/review again before serving old facts.
    const {error:hideError}=await db.from('club_events').update({ingestion_status:'needs_review',review_reasons:['source_post_changed']})
      .eq('source','instagram').in('source_id',changed.flatMap(p=>Array.from({length:10},(_,i)=>`${p.source_id}:${i}`)));
    dbError(hideError);
  }
  return {saved:changed.length,unchanged:posts.length-changed.length};
}

export function apifyClient(token:string,fetcher:typeof fetch=fetch) {
  if(!token) throw new Error('missing_apify_api_token');
  return async (path:string,init:RequestInit={}) => {
    if(!path.startsWith('/v2/') || path.includes('..')) throw new Error('invalid_apify_path');
    const response=await fetcher(`https://api.apify.com${path}`,{...init,headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json',...init.headers},
      redirect:'error',signal:AbortSignal.timeout(60000)});
    if(!response.ok) {await response.body?.cancel();throw new Error(`apify_http_${response.status}`);}
    return JSON.parse(await boundedText(response,12_000_000));
  };
}
