import type {AskRequest,Intent} from './schema';

// Exact UI/common commands can preserve constraints without another model call.
// Everything else still uses language interpretation; never approximate a query.
export function interpretFollowUp(request:AskRequest):Intent|null {
  if(!request.context)return null;
  const message=request.message.toLowerCase().trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
  const intent:Intent={action:'refine',resultIndex:null,clearLocation:false,clarification:null,
    patch:{kind:null,time:null,nearPlace:null,useUserLocation:null,radiusMeters:null,freeOnly:null,categories:null,terms:null}};
  if(/^(?:only |show only |just )(?:the )?free (?:ones|options|results)$/.test(message))intent.patch.freeOnly=true;
  else if(message==='search across campus')intent.clearLocation=true;
  else if(message==='show other interests')intent.patch.terms=[];
  else if(message==='show upcoming events this week'){intent.patch.kind='events';intent.patch.time={period:'next7days',date:null};}
  else if(message==='which of those is closest'||message==='which of those is closer')intent.action='compare';
  else {
    const detail=message.match(/^(?:tell me more about|more about) (?:the )?(first|second|third|fourth)(?: one| result| event)?$/);
    if(!detail)return null;
    intent.action='details';intent.resultIndex=['first','second','third','fourth'].indexOf(detail[1])+1;
  }
  return intent;
}
