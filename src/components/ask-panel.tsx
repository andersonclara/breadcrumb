'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowUp,ExternalLink,LocateFixed,MapPin,RotateCcw,Square} from 'lucide-react';
import {useAskRequest} from '@breadcrumb/client';
import {ASK_TURN_LIMIT,askPrompts,askFilterLabels,askRecordAvailable,discoveryTime,discoveryProvenance,discoveryMatch,discoveryKey,inCampus,mappable,roundedLocation,safeDiscoveryUrl,type AskContext,type AskResult,type Coordinate,type DiscoveryRecord} from '@breadcrumb/shared';
import {ToastLogo} from './pixel-art';

type Turn={id:number;question:string;result:AskResult};
export function AskPanel({open,onClose,onMap}:{open:boolean;onClose:()=>void;onMap?:(record:DiscoveryRecord)=>void}) {
  const [turns,setTurns]=useState<Turn[]>([]),[input,setInput]=useState(''),[context,setContext]=useState<AskContext>();
  const [locationEnabled,setLocationEnabled]=useState(false),[locating,setLocating]=useState(false),[question,setQuestion]=useState('');
  const [now,setNow]=useState(()=>Date.now());
  const {run,cancel,pending,error,setError,retrySeconds}=useAskRequest();
  const end=useRef<HTMLDivElement>(null),field=useRef<HTMLTextAreaElement>(null),locationEpoch=useRef(0);
  const latest=turns.at(-1)?.result;
  useEffect(()=>{if(open)field.current?.focus();},[open]);
  useEffect(()=>{if(open)end.current?.scrollIntoView({block:'nearest'});},[turns,pending,open]);
  useEffect(()=>{if(!open)return;const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[open]);
  useEffect(()=>()=>{locationEpoch.current++;},[]);
  useEffect(()=>{
    const hide=()=>{if(document.visibilityState==='hidden'){cancel();locationEpoch.current++;setLocating(false);}};
    document.addEventListener('visibilitychange',hide);
    return()=>document.removeEventListener('visibilitychange',hide);
  },[cancel]);
  function getLocation():Promise<Coordinate> {
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){reject(new Error('Location is unavailable. Try a campus place like Reitz.'));return;}
      navigator.geolocation.getCurrentPosition(position=>{
        const point=roundedLocation({latitude:position.coords.latitude,longitude:position.coords.longitude});
        if(!inCampus(point)){reject(new Error('Choose a UF campus place to search from your current location.'));return;}
        resolve(point);
      },()=>reject(new Error('Could not get your location. Choose a campus place or enable location again.')),{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
    });
  }
  async function send(value=input) {
    const message=value.trim();if(!message||pending||retrySeconds||locating)return;
    setQuestion(message);setInput(message);
    const result=await run(async signal=>{
      const coarseUserLocation=locationEnabled?await getLocation():undefined;
      signal.throwIfAborted();
      return fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},signal,
        body:JSON.stringify({message,...(context?{context}:{}),...(coarseUserLocation?{coarseUserLocation}:{})})});
    });
    if(result){setTurns(previous=>[...previous,{id:Date.now(),question:message,result}].slice(-ASK_TURN_LIMIT));setContext(result.context);setInput('');}
  }
  function reset(all:boolean) {
    cancel();locationEpoch.current++;setLocating(false);setError('');setContext(undefined);setLocationEnabled(false);
    if(all){setTurns([]);setInput('');setQuestion('');}
    field.current?.focus();
  }
  async function toggleLocation() {
    if(locationEnabled){locationEpoch.current++;setLocationEnabled(false);return;}
    const epoch=++locationEpoch.current;setLocating(true);setError('');
    try{await getLocation();if(epoch===locationEpoch.current)setLocationEnabled(true);}
    catch(err){if(epoch===locationEpoch.current)setError(err instanceof Error?err.message:'Could not enable location.');}
    finally{if(epoch===locationEpoch.current)setLocating(false);}
  }
  return <section className="game-panel ask-panel" hidden={!open} aria-label="Ask Breadcrumb">
    <div className="panel-heading"><span className="pixel-kicker">ASK BREADCRUMB</span><button onClick={()=>{cancel();onClose();}} aria-label="Close chat">×</button></div>
    <div className="ask-toolbar"><span>PUBLIC CAMPUS DISCOVERIES</span><button onClick={()=>reset(true)}><RotateCcw size={14}/> New chat</button></div>
    <div className="ask-conversation" role="log" aria-label="Conversation" aria-live="polite" aria-busy={pending}>
      {!turns.length&&!pending&&<div className="ask-welcome"><ToastLogo size={52}/><h2>A little help finding<br/>your next thing.</h2><p>Find campus events, free food, and fresh student reports.</p><div className="ask-suggestions">{askPrompts.map(q=><button disabled={!!retrySeconds||locating} key={q} onClick={()=>void send(q)}>{q}<span aria-hidden="true">↗</span></button>)}</div></div>}
      {turns.map(turn=><article className="ask-turn" key={turn.id}><p className="ask-question">{turn.question}</p><div className="ask-answer"><span className="pixel-kicker">BREADCRUMB</span><p>{turn.result.answer}</p></div>
        <ol className="ask-results">{turn.result.cards.map((r,index)=>{
          const available=askRecordAvailable(r,now),url=safeDiscoveryUrl(r.sourceUrl);
          return <li key={discoveryKey(r)}><div className="ask-result-meta"><span>OPTION {index+1}</span><span>{r.priceType==='free'?(r.kind==='crumb'?'Reported free':'Free admission'):r.priceText||'Admission not listed'}</span></div><h3>{r.title}</h3>
            <p>{discoveryTime(r,now)}{r.venue?` · ${r.venue}`:''}</p><p className="ask-provenance">{discoveryProvenance(r)}</p>
            {r.description&&<p>{r.description}</p>}{discoveryMatch(r,turn.result.context.constraints)&&<p className="ask-match">{discoveryMatch(r,turn.result.context.constraints)}</p>}
            {!available&&<p className="ask-error">This discovery has ended or expired. Search again for current results.</p>}
            <div className="ask-card-actions">{available&&url&&<a href={url} target="_blank" rel="noopener noreferrer">View source <ExternalLink size={13}/></a>}
              {available&&onMap&&mappable(r)&&inCampus({latitude:r.latitude!,longitude:r.longitude!})&&<button className="pixel-button subtle" onClick={()=>onMap(r)}><MapPin size={14}/> View on map</button>}
            </div></li>;
        })}</ol>
        {!!turn.result.cards.length&&<p className="ask-freshness">{turn.result.dataFreshnessNote}</p>}
      </article>)}
      {pending&&<div><p className="ask-question">{question}</p><p role="status" className="ask-loading">Looking through campus discoveries…</p></div>}
      {latest&&context&&!pending&&<div className="ask-followups" aria-label="Suggested follow-ups">{latest.suggestedFollowUps.map(q=><button disabled={!!retrySeconds||locating} key={q} onClick={()=>void send(q)}>{q}</button>)}</div>}
      {error&&<div role="alert" className="ask-error"><p>{error}</p><button type="button" disabled={pending||!!retrySeconds} onClick={()=>void send(question)}>Retry question</button></div>}
      {!!retrySeconds&&<p role="status" className="ask-freshness">Try again in {retrySeconds}s.</p>}
      <div ref={end}/>
    </div>
    <form className="ask-composer" onSubmit={e=>{e.preventDefault();void send();}}>
      {context&&<div className="ask-filters" aria-label="Active search filters">{askFilterLabels(context.constraints).map((label,i)=><span key={`${i}:${label}`}>{label}</span>)}<button type="button" onClick={()=>reset(false)}>Clear filters</button></div>}
      <label htmlFor="ask-message">Ask Breadcrumb</label><div className="ask-input-row"><textarea ref={field} id="ask-message" value={input} onChange={e=>setInput(e.target.value)} placeholder="What’s happening around campus?" rows={2} maxLength={1200} disabled={pending} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/>
        {pending?<button key="stop" className="pixel-button" type="button" onClick={event=>{event.preventDefault();cancel();}} aria-label="Stop search"><Square size={18}/></button>:<button key="send" className="pixel-button" type="submit" disabled={!input.trim()||!!retrySeconds||locating} aria-label="Send question"><ArrowUp size={20}/></button>}</div>
      <button className="ask-location" type="button" disabled={pending||locating} aria-pressed={locationEnabled} onClick={()=>void toggleLocation()}><LocateFixed size={14}/>{locating?'Finding location…':locationEnabled?'Approximate location on · Remove':'Use approximate location'}</button>
    </form>
  </section>;
}
