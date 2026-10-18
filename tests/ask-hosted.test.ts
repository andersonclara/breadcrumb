import {expect,it,vi} from 'vitest';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
vi.mock('server-only',()=>({}));
import {POST} from '../src/app/api/ask/route';
import type {AskRequest,AskResponse} from '../src/lib/ai/ask/schema';
import {publicSourceUrl} from '../src/lib/ai/ask/search';

// Explicit opt-in: uses the configured hosted project, model, and real quota.
// Never creates campus content or changes users, ingestion records or schema.
it.skipIf(process.env.ASK_HOSTED_SMOKE!=='1')('runs the real Ask route with hosted retrieval, citations, follow-ups and no-results behavior',async()=>{
  nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
  async function request(body:AskRequest) {
    const response=await POST(new Request('http://localhost/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
    expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
    return await response.json() as AskResponse;
  }
  const first=await request({message:'Show upcoming events over the next seven days, with no location or price filter.'});
  expect(first.status).toBe('results');expect(first.cards.length).toBeGreaterThan(0);
  expect(first.appliedConstraints.kind).toBe('events');expect(first.appliedConstraints.time.period).toBe('next7days');
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('club_events').select('id,url,ingestion_status').in('id',first.cards.map(c=>c.id)).abortSignal(AbortSignal.timeout(12000));
  expect(error).toBeNull();
  for(const card of first.cards) {
    const row=data?.find(r=>r.id===card.id);expect(row).toBeDefined();expect(row?.ingestion_status).toBe('published');
    expect(card.sourceUrl).toBe(publicSourceUrl(row!.url));expect(card.kind).toBe('event');
  }
  const followUp=await request({message:'Only free ones',context:first.context});
  expect(['results','no_results']).toContain(followUp.status);expect(followUp.appliedConstraints.freeOnly).toBe(true);
  expect(followUp.appliedConstraints.kind).toBe(first.appliedConstraints.kind);
  expect(followUp.appliedConstraints.time).toEqual(first.appliedConstraints.time);
  expect(followUp.cards.every(c=>c.priceType==='free')).toBe(true);
  const empty=await request({message:'Find events titled zzyyxxmissingbreadcrumb9876 in the next seven days.'});
  expect(empty.status).toBe('no_results');expect(empty.cards).toEqual([]);
  console.info(JSON.stringify({hostedAsk:'passed',firstCards:first.cards.length,followUpStatus:followUp.status,freeCards:followUp.cards.length,noResultsStatus:empty.status}));
},90000);
