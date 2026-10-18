'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowUp,ExternalLink,LocateFixed,RotateCcw} from 'lucide-react';
import {discoveryTime,roundedLocation,type Coordinate,type AskResult} from '@breadcrumb/shared';
import {ToastLogo} from './pixel-art';

const prompts=['Free food today','Events near Reitz this week','Something creative this week'];
type Turn={question:string;result:AskResult};
export function AskPanel({open,onClose}:{open:boolean;onClose:()=>void}) {
 const [turns,setTurns]=useState<Turn[]>([]),[input,setInput]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const [location,setLocation]=useState<Coordinate|null>(null),[locating,setLocating]=useState(false);
 const busy=useRef(false),controller=useRef<AbortController|null>(null),end=useRef<HTMLDivElement>(null);
 const latest=turns.at(-1)?.result;
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{if(open)end.current?.scrollIntoView({block:'nearest'});},[turns,pending,open]);
 async function send(value=input) {
  const question=value.trim();if(!question||busy.current)return;
  busy.current=true;setPending(true);setError('');setInput(question);
  const request=new AbortController();controller.current=request;
  try {
   const response=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)]),
    body:JSON.stringify({message:question,...(latest?{context:latest.context}:{}),...(location?{coarseUserLocation:location}:{})})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Could not search campus. Try again.');
   if(!Array.isArray(data.cards)||!data.context||typeof data.answer!=='string')throw new Error('Could not read that answer. Try again.');
   setTurns(previous=>[...previous,{question,result:data as AskResult}]);setInput('');
  }catch(err){if(!request.signal.aborted)setError(err instanceof Error?err.message:'Could not connect. Try again.');}
  finally{busy.current=false;setPending(false);}
 }
 function locate() {
  if(location){setLocation(null);return;}
  if(!navigator.geolocation){setError('Location is unavailable. Try a campus place like Reitz.');return;}
  setLocating(true);setError('');
  navigator.geolocation.getCurrentPosition(position=>{
   const point=roundedLocation({latitude:position.coords.latitude,longitude:position.coords.longitude});
   if(point.latitude<29.60||point.latitude>29.70||point.longitude< -82.42||point.longitude> -82.28)setError('Choose a UF campus place to search from your current location.');
   else setLocation(point);
   setLocating(false);
  },()=>{setLocating(false);setError('Could not get your location. Try a campus place like Reitz.');},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 }
 return <section className="game-panel ask-panel" hidden={!open} aria-label="Ask Breadcrumb">
  <div className="panel-heading"><span className="pixel-kicker">ASK BREADCRUMB</span><button onClick={onClose} aria-label="Close chat">×</button></div>
  <div className="ask-toolbar"><span>YOUR CAMPUS GUIDE</span><button disabled={pending||locating} onClick={()=>{setTurns([]);setInput('');setError('');setLocation(null);}}><RotateCcw size={14}/> New chat</button></div>
  <div className="ask-conversation" role="log" aria-label="Conversation" aria-busy={pending}>
   {!turns.length&&<div className="ask-welcome"><ToastLogo size={52}/><h2>A little help finding<br/>your next thing.</h2><p>Find campus events, free food, and fresh student reports.</p><div className="ask-suggestions">{prompts.map(q=><button disabled={pending} key={q} onClick={()=>void send(q)}>{q}<span aria-hidden="true">↗</span></button>)}</div></div>}
   {turns.map((turn,i)=><article className="ask-turn" key={i}><p className="ask-question">{turn.question}</p><div className="ask-answer"><span className="pixel-kicker">BREADCRUMB</span><p>{turn.result.answer}</p></div>
    <ol className="ask-results">{turn.result.cards.map((r,index)=><li key={`${r.kind}:${r.id}`}><div className="ask-result-meta">{index+1} ? {r.kind==='event'?'SCHEDULED EVENT':'CAMPUS REPORT'}<span>{r.priceType==='free'?(r.kind==='crumb'?'Reported free':'Free'):r.priceText||'Price unknown'}</span></div><h3>{r.title}</h3><p>{discoveryTime(r)}{r.venue?` · ${r.venue}`:''}</p>{r.description&&<p>{r.description}</p>}{r.sourceUrl&&<a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">View {r.source==='instagram'?'Instagram post':'source'} <ExternalLink size={13}/></a>}</li>)}</ol>
    {turn.result.cards.length>0&&<p className="ask-freshness">{turn.result.dataFreshnessNote}</p>}
   </article>)}
   {pending&&<p role="status" className="ask-loading">Looking through campus discoveries…</p>}
   <div ref={end}/>
  </div>
  {latest&&!pending&&<div className="ask-followups">{latest.suggestedFollowUps.map(q=><button key={q} onClick={()=>void send(q)}>{q}</button>)}</div>}
  <form className="ask-composer" onSubmit={e=>{e.preventDefault();void send();}}>
   {error&&<p role="alert" className="ask-error">{error} Your question is ready to retry.</p>}
   <label htmlFor="ask-message">Ask Breadcrumb</label><div className="ask-input-row"><textarea id="ask-message" value={input} onChange={e=>setInput(e.target.value)} placeholder="What’s happening around campus?" rows={2} maxLength={1200} disabled={pending} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><button className="pixel-button" type="submit" disabled={pending||!input.trim()} aria-label="Send question"><ArrowUp size={20}/></button></div>
   <button className="ask-location" type="button" disabled={pending||locating} aria-pressed={!!location} onClick={locate}><LocateFixed size={14}/>{locating?'Finding location…':location?'Approximate location on · Remove':'Use approximate location'}</button>
  </form>
 </section>;
}
