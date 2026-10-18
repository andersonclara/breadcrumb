import {expect,it,vi} from 'vitest';
import nextEnv from '@next/env';
vi.mock('server-only',()=>({}));
import {interpret,explain} from '../src/lib/ai/ask/model';
import {mergeConstraints} from '../src/lib/ai/ask/agent';
import {defaultConstraints,type DiscoveryRecord} from '../src/lib/ai/ask/schema';

// Explicit opt-in: consumes one real provider request, never writes to Supabase.
it.skipIf(process.env.ASK_LIVE_SMOKE!=='1')('interprets a real discovery question with the configured Ask model',async()=>{
  nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
  const result=await interpret({message:'Any free events near Reitz tonight?'},new Date(),AbortSignal.timeout(22000));
  expect(result.action).toBe('search');expect(result.patch.freeOnly).toBe(true);
  expect(result.patch.nearPlace?.toLowerCase()).toContain('reitz');expect(result.patch.time?.period).toBe('tonight');
},25000);

it.skipIf(process.env.ASK_LIVE_SMOKE!=='1')('preserves follow-up constraints and cites supplied demo evidence using the real Ask model',async()=>{
  nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
  const constraints={...defaultConstraints,kind:'events' as const,nearPlace:'Reitz',terms:['coding'],time:{period:'tonight' as const,date:null}};
  const id='00000000-0000-4000-8000-000000000001';
  const intent=await interpret({message:'Only free ones',context:{constraints,results:[{kind:'event',id}],referencePlace:'Reitz'}},new Date(),AbortSignal.timeout(22000));
  const updated=mergeConstraints(constraints,intent);
  expect(updated.freeOnly).toBe(true);expect(updated.nearPlace).toBe('Reitz');expect(updated.time.period).toBe('tonight');expect(updated.terms).toEqual(['coding']);
  // Deliberately fictional evidence, never inserted into the campus feed.
  const record:DiscoveryRecord={kind:'event',id,title:'DEMO coding workshop',description:'Fictional test fixture, not a real event.',category:null,venue:'Reitz Union',latitude:null,longitude:null,
    startsAt:'2026-10-18T00:00:00Z',endsAt:'2026-10-18T01:00:00Z',eventDate:'2026-10-17',allDay:false,createdAt:null,expiresAt:null,state:null,
    confirmCount:0,disputeCount:0,source:'demo',sourceUrl:'https://example.test/demo-event',lastSyncedAt:null,priceText:'Free',priceType:'free',distanceMeters:null};
  const result=await explain('What did you find?',updated,[record],AbortSignal.timeout(22000));
  expect(result.citations).toEqual([{kind:'event',id}]);expect(result.answer.length).toBeGreaterThan(0);
},45000);
