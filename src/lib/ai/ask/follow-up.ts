import type {AskRequest,Intent} from './schema';

// Exact UI/common commands can preserve constraints without another model call.
// Everything else still uses language interpretation; never approximate a query.
export function interpretFollowUp(request:AskRequest):Intent|null {
  const message=request.message.toLowerCase().trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
  const intent:Intent={action:'refine',resultIndex:null,clearLocation:false,clarification:null,
    patch:{kind:null,time:null,nearPlace:null,useUserLocation:null,radiusMeters:null,freeOnly:null,categories:null,terms:null}};
  if(/^(?:clear (?:the )?(?:search )?(?:context|filters)|reset (?:the )?(?:search|filters)|start over|new search)$/.test(message))return {...intent,action:'reset'};
  if(!request.context)return null;
  const pending=request.context.pending;
  if(/^(?:only |show only |just )(?:the )?free (?:ones|options|results)$/.test(message))intent.patch.freeOnly=true;
  else if(/^(?:include paid (?:ones|options|events)|any price|remove (?:the )?price filter)$/.test(message))intent.patch.freeOnly=false;
  else if(message==='search across campus')intent.clearLocation=true;
  else if(message==='show other interests')intent.patch.terms=[];
  else if(message==='show upcoming events this week'){intent.patch.kind='events';intent.patch.time={period:'next7days',date:null};}
  else if(/^(?:which of those is (?:closest|closer)|show (?:the )?closest(?: one)?|which is closest)$/.test(message))intent.action='compare';
  else if(/^(?:use (?:my )?(?:approximate |current )?location|near me)$/.test(message))intent.patch.useUserLocation=true;
  else if(/^(?:show results near |near )?(?:reitz(?: union)?|marston(?: science library)?|library west|lib west|century tower)$/.test(message)) {
    intent.patch.nearPlace=message.replace(/^(?:show results near |near )/,'');
    if(pending){intent.action=pending.action;intent.resultIndex=pending.resultIndex;}
  }
  else {
    const detail=message.match(/^(?:(?:tell me more about|more about|details (?:on|about)|show) )?(?:the )?(first|second|third|fourth|[1-4])(?: one| result| event)?$/);
    if(!detail)return null;
    intent.action='details';intent.resultIndex=/^[1-4]$/.test(detail[1])?Number(detail[1]):['first','second','third','fourth'].indexOf(detail[1])+1;
  }
  if(pending&&intent.action==='refine'&&(intent.patch.useUserLocation===true||intent.clearLocation)) {
    intent.action=pending.action;intent.resultIndex=pending.resultIndex;
  }
  return intent;
}
