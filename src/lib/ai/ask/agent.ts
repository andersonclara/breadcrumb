import 'server-only';
import {roundedLocation} from '@breadcrumb/shared';
import {defaultConstraints,type AskRequest,type AskResponse,type Constraints,type Intent,type Place,type DiscoveryRecord} from './schema';
import {timeWindow} from './time';
import {rankRecords} from './search';

type Explanation={answer:string;citations:{kind:'event'|'crumb';id:string}[]};
export type AskDependencies={
  interpret:(request:AskRequest,now:Date,signal:AbortSignal)=>Promise<Intent>;
  explain:(message:string,constraints:Constraints,records:DiscoveryRecord[],signal:AbortSignal)=>Promise<Explanation>;
  places:(query:string)=>Promise<Place[]>;
  search:(constraints:Constraints,window:{start:string;end:string},origin:Place|null,refs?:AskRequest['context'])=>Promise<DiscoveryRecord[]>;
};
export function mergeConstraints(previous:Constraints|undefined,intent:Intent):Constraints {
  const base=intent.action==='reset'?defaultConstraints:(previous??defaultConstraints);
  const patch=Object.fromEntries(Object.entries(intent.patch).filter(([,value])=>value!==null));
  const merged={...base,...patch};
  if(intent.clearLocation){merged.nearPlace=null;merged.useUserLocation=false;}
  if(intent.patch.useUserLocation===true)merged.nearPlace=null;
  if(intent.patch.nearPlace!==null)merged.useUserLocation=false;
  return merged;
}
const freshness='Results reflect current published listings and fresh public campus reports. Full Loaf means community corroborated. Distances are approximate straight-line distances.';
export async function ask(request:AskRequest,deps:AskDependencies,signal:AbortSignal,now=new Date()):Promise<AskResponse> {
  const intent=await deps.interpret(request,now,signal);
  const constraints=mergeConstraints(request.context?.constraints,intent);
  let origin:Place|null=null;
  let window:{start:string;end:string};
  try {window=timeWindow(constraints.time,now);}catch {
    window=timeWindow(defaultConstraints.time,now);
    return response('clarification','Please choose a valid day within the next seven days.');
  }
  function response(status:AskResponse['status'],answer:string,cards:DiscoveryRecord[]=[],followUps:string[]=[]):AskResponse {
    return {status,answer,cards,appliedConstraints:{...constraints,window,origin},
      context:{constraints,results:cards.map(({id,kind})=>({id,kind})),referencePlace:constraints.nearPlace},
      suggestedFollowUps:followUps,dataFreshnessNote:freshness};
  }
  if(intent.action==='unsupported')return response('unsupported',intent.clarification??'I can help discover published campus events and fresh public Crumbs.');
  if(intent.action==='clarify')return response('clarification',intent.clarification??'What would you like to discover, and where or when?');
  if(constraints.useUserLocation) {
    if(!request.coarseUserLocation)return response('clarification','Choose a campus place or share your approximate foreground location for this search.');
    origin={name:'Your approximate location',aliases:[],...roundedLocation(request.coarseUserLocation)};
  } else if(constraints.nearPlace) {
    const matches=await deps.places(constraints.nearPlace);
    const exact=matches.filter(p=>[p.name,...p.aliases].some(n=>n.toLowerCase()===constraints.nearPlace!.toLowerCase()));
    if(exact.length===1)origin=exact[0];
    else if(matches.length===1)origin=matches[0];
    else return response('clarification',matches.length?`Which place do you mean: ${matches.map(p=>p.name).join(', ')}?`:`I couldn't resolve “${constraints.nearPlace}” to a known campus location. Try Reitz, Marston, or Library West.`);
  }
  const comparison=intent.action==='compare';
  if(comparison&&!request.context?.results.length)return response('clarification','Run a discovery search first so I can compare its results.');
  if(comparison&&!origin)return response('clarification','Which campus place should I use to compare distances?');
  const records=rankRecords(await deps.search(constraints,window,origin,comparison?request.context:undefined));
  if(!records.length)return response('no_results',"I couldn't find matching records in our current data. That doesn't mean nothing is happening. You can broaden the search below.",[],[
    ...(constraints.nearPlace||constraints.useUserLocation?['Search across campus']:[]),
    ...(constraints.time.period!=='next7days'?['Show upcoming events this week']:[]),
    ...(constraints.terms.length?['Show other interests']:[]),
  ].slice(0,3));
  // Re-read selected IDs immediately before responding. Expiry or moderation may
  // have changed while the model was generating; old chat IDs are never authority.
  let explanation:Explanation|null=null;
  try {if(!comparison)explanation=await deps.explain(request.message,constraints,records,signal);}catch {
    if(signal.aborted)throw new Error('ask_timeout');
  }
  const current=rankRecords(await deps.search(constraints,window,origin,{constraints,results:records.map(({id,kind})=>({id,kind})),referencePlace:constraints.nearPlace}));
  if(!current.length)return response('no_results','Those records are no longer available under this search. Try searching again.');
  if(comparison) {
    const nearest=current[0];
    return response('results',`The closest of those results is “${nearest.title}”, about ${nearest.distanceMeters} meters from ${origin!.name} in a straight line.`,current);
  }
  const allowed=new Set(current.map(r=>`${r.kind}:${r.id}`));
  const valid=explanation&&explanation.citations.length>0&&explanation.citations.every(r=>allowed.has(`${r.kind}:${r.id}`))
    &&!/(?:https?:\/\/|www\.|\[[^\]]*\]\()/i.test(explanation.answer);
  // If any candidate was retracted, avoid prose that may still describe it.
  const stable=records.length===current.length&&records.every(r=>current.some(c=>JSON.stringify(c)===JSON.stringify(r)));
  const cards=valid&&stable?current.filter(r=>explanation!.citations.some(c=>c.kind===r.kind&&c.id===r.id)):current;
  return response('results',valid&&stable?explanation!.answer:`I found ${cards.length} matching ${cards.length===1?'result':'results'}. Check the source and freshness details on each card.`,cards,
    [origin?'Which of those is closest?':'Show results near Reitz',...(!constraints.freeOnly?['Only free options']:[])].slice(0,2));
}
