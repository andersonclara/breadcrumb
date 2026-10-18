import {expect,it,vi} from 'vitest';
import nextEnv from '@next/env';
vi.mock('server-only',()=>({}));
import {POST} from '../src/app/api/ask/route';
import {advertisedFreeFood,parseAskResult} from '@breadcrumb/shared';

// Read-only opt-in. Uses normal public retrieval, provider usage and quotas.
it.skipIf(process.env.ASK_HOSTED_SMOKE!=='1')('finds explicitly advertised food without assuming free admission',async()=>{
  nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
  const response=await POST(new Request('http://localhost/api/ask',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:'Find scheduled events advertising free cookies over the next seven days. Admission price can be unknown.'}),
  }));
  expect(response.status).toBe(200);
  const result=parseAskResult(await response.json());
  expect(result.context.constraints.freeFoodOnly).toBe(true);
  expect(result.context.constraints.freeOnly).toBe(false);
  expect(['results','no_results']).toContain(result.status);
  for(const card of result.cards){
    expect(card.kind).toBe('event');expect(advertisedFreeFood(card)).toBe(true);
    expect(card.sourceUrl).toMatch(/^https?:\/\//);
  }
},35000);
