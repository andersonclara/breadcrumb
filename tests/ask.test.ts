import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {ask,mergeConstraints,type AskDependencies} from '../src/lib/ai/ask/agent';
import {askRequestSchema,defaultConstraints,intentSchema,type Intent,type DiscoveryRecord} from '../src/lib/ai/ask/schema';
import {timeWindow} from '../src/lib/ai/ask/time';
import {publicSourceUrl,rankRecords} from '../src/lib/ai/ask/search';
import {quotaKey,readAskBody} from '../src/lib/ai/ask/http';

const id='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const now=new Date('2026-10-17T23:00:00Z');
const signal=new AbortController().signal;
const place={name:'Reitz Union',aliases:['Reitz'],latitude:29.6462,longitude:-82.3478};
const intent=(patch:Partial<Intent['patch']>={},action:Intent['action']='search'):Intent=>({
  action,clearLocation:false,clarification:null,patch:{kind:null,time:null,nearPlace:null,useUserLocation:null,radiusMeters:null,freeOnly:null,categories:null,terms:null,...patch},
});
const record:DiscoveryRecord={kind:'event',id,title:'Test coding workshop',description:null,category:null,venue:'Reitz Union',latitude:place.latitude,longitude:place.longitude,
  startsAt:'2026-10-18T00:00:00Z',endsAt:null,eventDate:'2026-10-17',allDay:false,createdAt:null,expiresAt:null,state:null,confirmCount:0,disputeCount:0,
  source:'test',sourceUrl:'https://example.test/event',lastSyncedAt:now.toISOString(),priceText:'Free',priceType:'free',distanceMeters:null};
let deps:AskDependencies;
beforeEach(()=>{deps={interpret:vi.fn().mockResolvedValue(intent()),explain:vi.fn().mockResolvedValue({answer:'There is a matching workshop.',citations:[{kind:'event',id}]}),places:vi.fn().mockResolvedValue([place]),search:vi.fn().mockResolvedValue([record])};});

describe('Ask search context and grounding',()=>{
  it('preserves time/location/interests on a free-only follow-up',()=>{
    const previous={...defaultConstraints,time:{period:'tonight' as const,date:null},nearPlace:'Reitz',terms:['coding']};
    expect(mergeConstraints(previous,intent({freeOnly:true},'refine'))).toEqual({...previous,freeOnly:true});
  });
  it('supports explicit location clearing and full reset',()=>{
    const previous={...defaultConstraints,nearPlace:'Reitz',freeOnly:true};
    expect(mergeConstraints(previous,{...intent(),clearLocation:true})).toEqual({...previous,nearPlace:null});
    expect(mergeConstraints(previous,intent({},'reset'))).toEqual(defaultConstraints);
  });
  it('returns source-backed cards and reusable public context',async()=>{
    const result=await ask({message:'Any workshops?'},deps,signal,now);
    expect(result.status).toBe('results');expect(result.cards).toEqual([record]);
    expect(result.context.results).toEqual([{kind:'event',id}]);expect(deps.search).toHaveBeenCalledTimes(2);
  });
  it('rejects model-invented citations and URLs with a deterministic fallback',async()=>{
    vi.mocked(deps.explain).mockResolvedValue({answer:'Visit https://invented.test',citations:[{kind:'event',id:other}]});
    const result=await ask({message:'Anything tonight?'},deps,signal,now);
    expect(result.answer).toContain('I found 1 matching result');expect(result.answer).not.toContain('invented');expect(result.cards).toEqual([record]);
  });
  it('does not resurrect a record removed during generation',async()=>{
    vi.mocked(deps.search).mockResolvedValueOnce([record]).mockResolvedValueOnce([]);
    const result=await ask({message:'Anything tonight?'},deps,signal,now);
    expect(result.status).toBe('no_results');expect(result.cards).toEqual([]);expect(result.answer).not.toContain('workshop');
  });
  it('discards prose if facts changed during generation',async()=>{
    vi.mocked(deps.search).mockResolvedValueOnce([record]).mockResolvedValueOnce([{...record,priceText:'Paid',priceType:'unknown'}]);
    const result=await ask({message:'Anything tonight?'},deps,signal,now);
    expect(result.answer).toContain('I found 1');expect(result.cards[0].priceText).toBe('Paid');
  });
  it('honestly handles empty results without broadening constraints',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent({nearPlace:'Reitz',freeOnly:true}));vi.mocked(deps.search).mockResolvedValue([]);
    const result=await ask({message:'Free events near Reitz?'},deps,signal,now);
    expect(result.status).toBe('no_results');expect(result.appliedConstraints.freeOnly).toBe(true);
    expect(result.suggestedFollowUps).toContain('Search across campus');expect(deps.explain).not.toHaveBeenCalled();
  });
  it('asks for location before near-me retrieval and never stores GPS in context',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent({useUserLocation:true}));
    expect((await ask({message:'Near me?'},deps,signal,now)).status).toBe('clarification');expect(deps.search).not.toHaveBeenCalled();
    const result=await ask({message:'Near me?',coarseUserLocation:{latitude:29.6462345,longitude:-82.3478765}},deps,signal,now);
    expect(result.appliedConstraints.origin?.latitude).not.toBe(29.6462345);expect(JSON.stringify(result.context)).not.toContain('latitude');
  });
  it('clarifies ambiguous venues instead of guessing a pin',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent({nearPlace:'library'}));vi.mocked(deps.places).mockResolvedValue([place,{...place,name:'Library West'}]);
    expect((await ask({message:'Near the library?'},deps,signal,now)).status).toBe('clarification');expect(deps.search).not.toHaveBeenCalled();
  });
  it('revalidates prior IDs for closest follow-ups',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent({},'compare'));
    const constraints={...defaultConstraints,nearPlace:'Reitz'};
    await ask({message:'Which of those is closer?',context:{constraints,results:[{kind:'event',id}],referencePlace:'Reitz'}},deps,signal,now);
    expect(deps.search).toHaveBeenCalledWith(constraints,expect.anything(),place,expect.objectContaining({results:[{kind:'event',id}]}));
  });
  it('requires a reference location for distance comparisons',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent({},'compare'));
    const result=await ask({message:'Which is closer?',context:{constraints:defaultConstraints,results:[{kind:'event',id}],referencePlace:null}},deps,signal,now);
    expect(result.status).toBe('clarification');expect(deps.search).not.toHaveBeenCalled();
  });
  it('computes closest wording from validated distances without another model call',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent({},'compare'));
    vi.mocked(deps.search).mockResolvedValue([{...record,distanceMeters:120}]);
    const result=await ask({message:'Which is closer?',context:{constraints:{...defaultConstraints,nearPlace:'Reitz'},results:[{kind:'event',id}],referencePlace:'Reitz'}},deps,signal,now);
    expect(result.answer).toContain('120 meters from Reitz Union');expect(deps.explain).not.toHaveBeenCalled();
  });
  it('returns a clarification for an impossible date',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent({time:{period:'date',date:'2026-02-30'}}));
    expect((await ask({message:'February 30?'},deps,signal,now)).status).toBe('clarification');expect(deps.search).not.toHaveBeenCalled();
  });
  it('keeps retrieval working if the explanation model fails',async()=>{
    vi.mocked(deps.explain).mockRejectedValue(new Error('model unavailable'));
    expect((await ask({message:'Events?'},deps,signal,now)).cards).toEqual([record]);
  });
  it('never retrieves data for unsupported requests',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue({...intent({},'unsupported'),clarification:'I cannot track a person.'});
    expect((await ask({message:'Find someone'},deps,signal,now)).status).toBe('unsupported');expect(deps.search).not.toHaveBeenCalled();
  });
});

describe('campus time, ranking and input boundaries',()=>{
  it('resolves tonight in Eastern time across UTC midnight',()=>{
    expect(timeWindow({period:'tonight',date:null},new Date('2026-10-18T01:00:00Z'))).toEqual({start:'2026-10-18T01:00:00.000Z',end:'2026-10-18T04:00:00.000Z'});
  });
  it('handles 23-hour and 25-hour campus days',()=>{
    const spring=timeWindow({period:'tomorrow',date:null},new Date('2026-03-07T18:00:00Z'));
    const autumn=timeWindow({period:'tomorrow',date:null},new Date('2026-10-31T18:00:00Z'));
    expect(Date.parse(spring.end)-Date.parse(spring.start)).toBe(23*3600000);expect(Date.parse(autumn.end)-Date.parse(autumn.start)).toBe(25*3600000);
  });
  it('rejects invalid/past/out-of-horizon dates',()=>{
    for(const date of ['2026-02-30','2026-10-01','2027-01-01'])expect(()=>timeWindow({period:'date',date},now)).toThrow();
  });
  it('keeps nearest results first and groups exact duplicated announcements',()=>{
    const near={...record,id:other,distanceMeters:10};
    expect(rankRecords([{...record,distanceMeters:100},near])).toEqual([near]);
  });
  it('rejects unbounded context, sightings and arbitrary input fields',()=>{
    expect(askRequestSchema.safeParse({message:'a'.repeat(1201)}).success).toBe(false);
    expect(askRequestSchema.safeParse({message:'hello',userId:id}).success).toBe(false);
    expect(askRequestSchema.safeParse({message:'hello',context:{constraints:{...defaultConstraints,categories:['sighting']},results:[],referencePlace:null}}).success).toBe(false);
    expect(intentSchema.safeParse({...intent(),patch:{...intent().patch,radiusMeters:50000}}).success).toBe(false);
  });
  it('allows only attributable public web links',()=>{
    for(const url of ['javascript:alert(1)','https://secret:password@example.test','file:///tmp/test'])expect(publicSourceUrl(url)).toBeNull();
    expect(publicSourceUrl('https://example.test/event')).toBe('https://example.test/event');
  });
  it('does not trust spoofed forwarding headers by default and HMACs configured IPs',()=>{
    const a=new Request('https://example.test',{headers:{'x-forwarded-for':'1.2.3.4'}});
    const b=new Request('https://example.test',{headers:{'x-forwarded-for':'5.6.7.8'}});
    expect(quotaKey(a,'secret','')).toBe(quotaKey(b,'secret',''));
    expect(quotaKey(a,'secret','x-forwarded-for')).not.toBe(quotaKey(b,'secret','x-forwarded-for'));
    expect(quotaKey(a,'secret','x-forwarded-for')).toMatch(/^[a-f0-9]{64}$/);
  });
  it('bounds streamed body bytes even without content-length',async()=>{
    const body=JSON.stringify({message:'🍞'.repeat(5000)});
    await expect(readAskBody(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json'},body}))).rejects.toMatchObject({status:413});
  });
});
