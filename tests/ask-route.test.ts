import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({ask:vi.fn(),quota:vi.fn(),admin:vi.fn(),create:vi.fn(),search:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@supabase/supabase-js',()=>({createClient:mocks.create}));
vi.mock('../src/lib/env',()=>({getSupabaseConfig:()=>({url:'https://example.supabase.co',key:'public-key'})}));
vi.mock('../src/lib/supabase/admin',()=>({createAdminClient:mocks.admin}));
vi.mock('../src/lib/ai/ask/model',()=>({interpret:vi.fn(),explain:vi.fn()}));
vi.mock('../src/lib/ai/ask/agent',()=>({ask:mocks.ask}));
vi.mock('../src/lib/ai/ask/search',()=>({createSearch:mocks.search}));
vi.mock('../src/lib/ai/ask/http',async importOriginal=>({...await importOriginal<object>(),takeQuota:mocks.quota}));
import {POST} from '../src/app/api/ask/route';
const request=(body:unknown,headers:Record<string,string>={})=>new Request('https://example.test/api/ask',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv('GEMINI_API_KEY','test');vi.stubEnv('GEMINI_MODEL','test-model');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','server-secret');
  vi.stubEnv('ASK_AI_PROVIDER','');vi.stubEnv('GROQ_API_KEY','');
  mocks.quota.mockResolvedValue(undefined);mocks.search.mockReturnValue({places:vi.fn(),search:vi.fn()});mocks.ask.mockResolvedValue({status:'no_results',cards:[]});
});
describe('public Ask endpoint',()=>{
  it('accepts a bounded demo seed but rejects expired sessions and arbitrary report injection before quota',async()=>{
    const demo={startedAt:Date.now(),seed:42};
    expect((await POST(request({message:'Free food now',demo}))).status).toBe(200);
    expect(mocks.ask.mock.calls[0][0].demo).toEqual(demo);
    mocks.quota.mockClear();
    expect((await POST(request({message:'Food',demo:{...demo,startedAt:Date.now()-300001}}))).status).toBe(410);
    expect((await POST(request({message:'Food',demo:{...demo,startedAt:Date.now()+60000}}))).status).toBe(410);
    expect((await POST(request({message:'Food',demo:{...demo,reports:[{title:'injected'}]}}))).status).toBe(400);
    expect(mocks.quota).not.toHaveBeenCalled();
  });
  it('allows native requests without cookies or a login and uses an anonymous read client',async()=>{
    const response=await POST(request({message:'Tonight?'}));expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');expect(mocks.quota).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledWith('https://example.supabase.co','public-key',expect.anything());
  });
  it('rejects cross-origin browser requests before consuming model quota',async()=>{
    expect((await POST(request({message:'Hi'},{Origin:'https://evil.test'}))).status).toBe(403);expect(mocks.quota).not.toHaveBeenCalled();
  });
  it('validates inputs before creating privileged clients',async()=>{
    expect((await POST(request({message:''}))).status).toBe(400);expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('fails closed when model configuration is absent',async()=>{
    vi.stubEnv('GEMINI_API_KEY','');expect((await POST(request({message:'Tonight?'}))).status).toBe(503);expect(mocks.ask).not.toHaveBeenCalled();
  });
  it('accepts Groq configuration without requiring Gemini credentials',async()=>{
    vi.stubEnv('GROQ_API_KEY','test-groq-key');vi.stubEnv('GEMINI_API_KEY','');vi.stubEnv('GEMINI_MODEL','');
    expect((await POST(request({message:'Tonight?'}))).status).toBe(200);
  });
  it('enforces shared quotas before any model invocation',async()=>{
    mocks.quota.mockRejectedValue(new Response('Please wait',{status:429,headers:{'Retry-After':'60'}}));
    const response=await POST(request({message:'Tonight?'}));expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('60');expect(mocks.ask).not.toHaveBeenCalled();
  });
  it('does not expose upstream errors or credentials',async()=>{
    mocks.ask.mockRejectedValue(new Error('server-secret upstream details'));
    const response=await POST(request({message:'Tonight?'}));expect(response.status).toBe(503);expect(await response.text()).not.toContain('server-secret');
  });
  it('gives a retry interval when the upstream model is rate limited',async()=>{
    mocks.ask.mockRejectedValue(new Error('ask_groq_unavailable_429'));
    const response=await POST(request({message:'Events?'}));
    expect(response.status).toBe(503);expect(response.headers.get('retry-after')).toBe('60');
    expect((await response.json()).error).toContain('retry in a minute');
  });
  it('rejects non-JSON and malformed JSON',async()=>{
    expect((await POST(new Request('https://example.test/api/ask',{method:'POST',body:'hello'}))).status).toBe(415);
    expect((await POST(new Request('https://example.test/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}))).status).toBe(400);
  });
});
