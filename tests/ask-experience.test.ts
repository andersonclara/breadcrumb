import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {advertisedFreeFood,askFilterLabels,discoveryProvenance,parseAskResult,readAskResponse,AskServiceError} from '@breadcrumb/shared';
import {ask,type AskDependencies} from '../src/lib/ai/ask/agent';
import {interpretFollowUp} from '../src/lib/ai/ask/follow-up';
import {createSearch} from '../src/lib/ai/ask/search';
import {defaultConstraints,type Intent,type DiscoveryRecord,type AskResponse} from '../src/lib/ai/ask/schema';
import * as mobile from '../packages/shared/src/index.mobile';

const id='00000000-0000-4000-8000-000000000001',second='00000000-0000-4000-8000-000000000002';
const now=new Date('2026-10-18T16:00:00Z'),signal=new AbortController().signal;
const record:DiscoveryRecord={kind:'event',id,title:'Speaker and cookies',description:'A speaker discussion with free cookies.',category:null,venue:'Reitz Union',latitude:29.6462,longitude:-82.3478,startsAt:'2026-10-18T20:00:00Z',endsAt:'2026-10-18T21:00:00Z',eventDate:'2026-10-18',allDay:false,createdAt:null,expiresAt:null,state:null,confirmCount:0,disputeCount:0,source:'instagram',sourceUrl:'https://instagram.com/p/example',lastSyncedAt:now.toISOString(),priceText:null,priceType:'unknown',distanceMeters:120};
const intent=(action:Intent['action']='search',patch:Partial<Intent['patch']>={}):Intent=>({action,resultIndex:null,clearLocation:false,clarification:null,patch:{kind:null,time:null,nearPlace:null,useUserLocation:null,radiusMeters:null,freeOnly:null,categories:null,terms:null,...patch}});
let deps:AskDependencies;
beforeEach(()=>{deps={interpret:vi.fn().mockResolvedValue(intent()),explain:vi.fn().mockResolvedValue({answer:'The listing advertises free cookies. Admission is not listed.',citations:[{kind:'event',id}]}),places:vi.fn().mockResolvedValue([{name:'Reitz Union',aliases:['Reitz'],latitude:29.6462,longitude:-82.3478}]),search:vi.fn().mockResolvedValue([record])};});

describe('conversation completion',()=>{
  it('continues a closest comparison after the user supplies the missing origin',async()=>{
    vi.mocked(deps.interpret).mockResolvedValueOnce(intent('compare'));
    const context={constraints:defaultConstraints,results:[{kind:'event' as const,id}],referencePlace:null};
    const clarify=await ask({message:'Which is closer?',context},deps,signal,now);
    expect(clarify.context.pending?.action).toBe('compare');
    expect(clarify.suggestedFollowUps).toContain('Near Reitz');
    vi.mocked(deps.interpret).mockResolvedValueOnce(intent('search',{nearPlace:'Reitz'}));
    const result=await ask({message:'Reitz',context:clarify.context},deps,signal,now);
    expect(result.answer).toContain('120 meters');expect(deps.explain).not.toHaveBeenCalled();
    expect(deps.search).toHaveBeenCalledWith(expect.anything(),expect.anything(),expect.anything(),expect.objectContaining({results:[{kind:'event',id}]}));
    expect(result.context.pending).toBeUndefined();
  });
  it('retains result references across an unsupported detour',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent('unsupported'));
    const context={constraints:defaultConstraints,results:[{kind:'event' as const,id}],referencePlace:null};
    const result=await ask({message:'Write my homework',context},deps,signal,now);
    expect(result.context.results).toEqual(context.results);expect(deps.search).not.toHaveBeenCalled();
  });
  it('offers numbered choices for ambiguous details and resolves a short reply',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent('details'));
    const context={constraints:defaultConstraints,results:[{kind:'event' as const,id},{kind:'event' as const,id:second}],referencePlace:null};
    const result=await ask({message:'Tell me more',context},deps,signal,now);
    expect(result.suggestedFollowUps).toHaveLength(2);
    expect(interpretFollowUp({message:'2',context:result.context})).toMatchObject({action:'details',resultIndex:2});
  });
  it('never describes an unknown distance as null meters',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent('compare',{nearPlace:'Reitz'}));
    vi.mocked(deps.search).mockResolvedValue([{...record,distanceMeters:null}]);
    const result=await ask({message:'Closest?',context:{constraints:defaultConstraints,results:[{kind:'event',id}],referencePlace:null}},deps,signal,now);
    expect(result.status).toBe('no_results');expect(result.answer).not.toContain('null meters');
  });
  it.each(['Clear filters','Clear search context','Start over','Reset search'])('resets on the explicit command %s',message=>{
    expect(interpretFollowUp({message})?.action).toBe('reset');
  });
  it('keeps explicit budget relaxation separate from the no-results search',async()=>{
    vi.mocked(deps.interpret).mockResolvedValue(intent('refine',{freeOnly:true}));vi.mocked(deps.search).mockResolvedValue([]);
    const result=await ask({message:'Only free ones',context:{constraints:{...defaultConstraints,time:{period:'next7days',date:null}},results:[],referencePlace:null}},deps,signal,now);
    expect(result.appliedConstraints.freeOnly).toBe(true);expect(result.suggestedFollowUps).toContain('Include paid options');
    expect(interpretFollowUp({message:'Include paid options',context:result.context})?.patch.freeOnly).toBe(false);
  });
  it('does not run retrieval or generation after cancellation',async()=>{
    const controller=new AbortController();controller.abort();
    await expect(ask({message:'Events'},deps,controller.signal,now)).rejects.toThrow();
    expect(deps.interpret).not.toHaveBeenCalled();
  });
});

describe('free-food evidence and admission are separate',()=>{
  it.each(['Free pizza at the workshop','Complimentary refreshments','Cookies are free','Free lunch','Free coffee'])('recognizes explicit evidence: %s',title=>{
    expect(advertisedFreeFood({title,description:null})).toBe(true);
  });
  it.each(['Free admission','Pizza available for purchase','Buy one get one free pizza','No free food','Free cookies with ticket purchase','Free pizza for members only','Free food while supplies last','Food is not free'])('does not promise unconditional free food: %s',title=>{
    expect(advertisedFreeFood({title,description:null})).toBe(false);
  });
  it('retrieves food announcements without falsely requiring or labelling free admission',async()=>{
    const rpc=vi.fn().mockReturnValue({abortSignal:()=>Promise.resolve({data:[record,{...record,id:second,title:'Free entry',description:'Food available for purchase.',priceType:'free'}],error:null})});
    const search=createSearch({rpc} as never,signal);
    const rows=await search.search({...defaultConstraints,kind:'events',freeFoodOnly:true},{start:now.toISOString(),end:'2026-10-19T04:00:00Z'},null);
    expect(rows).toHaveLength(1);expect(rows[0].priceType).toBe('unknown');
    expect(rpc.mock.calls[0][1].p.freeOnly).toBe(false);
  });
  it('keeps the food filter and current constraints visible',()=>{
    expect(askFilterLabels({...defaultConstraints,freeFoodOnly:true,nearPlace:'Reitz'})).toEqual(expect.arrayContaining(['Advertised free food','Near Reitz','Within 1.5 km']));
    expect(discoveryProvenance(record)).toBe('Instagram announcement');
    expect(discoveryProvenance({...record,kind:'crumb',source:'community',state:'full_loaf'})).toContain('community corroborated');
  });
  it('does not let a burnt report break the entire public search or reach the model',async()=>{
    const rpc=vi.fn().mockReturnValue({abortSignal:()=>Promise.resolve({data:[{...record,kind:'crumb',source:'community',state:'burnt'},{...record,kind:'crumb',id:second,state:'crumb'}],error:null})});
    const rows=await createSearch({rpc} as never,signal).search({...defaultConstraints,kind:'crumbs'},{start:now.toISOString(),end:'2026-10-19T04:00:00Z'},null);
    expect(rows).toHaveLength(1);expect(rows[0].id).toBe(second);
  });
});

describe('shared client response boundary',()=>{
  it('exposes the same usable request contract from the native entry point',()=>{
    expect(mobile.askPrompts.length).toBeGreaterThan(0);
    expect(mobile.parseAskResult).toBe(parseAskResult);
    expect(mobile.readAskResponse).toBe(readAskResponse);
  });
  async function response():Promise<AskResponse>{return ask({message:'Food'},deps,signal,now);}
  it('accepts a real complete controller response',async()=>{expect(parseAskResult(await response()).cards[0].id).toBe(id);});
  it('rejects malformed cards, injected links, and mismatched result references',async()=>{
    const result=await response();
    for(const altered of [
      {...result,cards:[{...record,sourceUrl:'javascript:alert(1)'}]},
      {...result,cards:[{...record,latitude:'29'}]},
      {...result,cards:[{...record,createdAt:'not a date'}]},
      {...result,context:{...result.context,results:[{kind:'event',id:second}]}},
      {...result,cards:[record,record]},
    ])expect(()=>parseAskResult(altered)).toThrow('Could not read');
  });
  it('honors server retry intervals and keeps the original recoverable message',async()=>{
    const before=Date.now();
    try{await readAskResponse(Response.json({error:'Please wait before asking again.'},{status:429,headers:{'Retry-After':'60'}}));throw new Error('Expected rejection');}
    catch(err){expect(err).toBeInstanceOf(AskServiceError);expect((err as AskServiceError).retryAt).toBeGreaterThanOrEqual(before+60000);}
  });
  it('handles non-JSON service failures',async()=>{await expect(readAskResponse(new Response('<html>Offline</html>',{status:503}))).rejects.toThrow('Please retry');});
});
