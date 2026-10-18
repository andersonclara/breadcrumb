'use client';
import {useEffect,useState} from 'react';
import {discoveryKey,discoveryTime,discoveryProvenance,isCurrentRecord,resolveDiscoveryLocation,safeDiscoveryUrl,type DiscoveryRecord} from '@breadcrumb/shared';

export function AskDiscovery({record,onCurrent,onBack}:{record:DiscoveryRecord;onCurrent:(record:DiscoveryRecord)=>void;onBack:()=>void}) {
  const [current,setCurrent]=useState<DiscoveryRecord|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let active=true;
    async function read(){
      try {
        const response=await fetch(`/api/discover?kind=${record.kind}&id=${record.id}`,{signal:controller.signal});
        const data=await response.json();
        if(!response.ok)throw new Error('Could not check this discovery. Please retry.');
        const latest:DiscoveryRecord|undefined=data.records?.find((r:DiscoveryRecord)=>discoveryKey(r)===discoveryKey(record));
        if(!latest||!isCurrentRecord(latest))throw new Error('This discovery has ended, expired, or is no longer available.');
        if(active){const resolved=resolveDiscoveryLocation(latest);setCurrent(resolved);onCurrent(resolved);}
      }catch(err){if(active)setError(controller.signal.aborted?'Checking this discovery took too long. Please retry.':err instanceof Error?err.message:'Could not check this discovery.');}
      finally{clearTimeout(timer);if(active)setLoading(false);}
    }
    void read();
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[record.kind,record.id,attempt,onCurrent,record]);
  const source=current&&safeDiscoveryUrl(current.sourceUrl);
  return <div className="ask-discovery"><button className="pixel-button subtle" onClick={onBack}>← Back to chat</button>
    {loading?<p role="status">Checking the latest details…</p>:error?<div role="alert"><p>{error}</p><button className="pixel-button" onClick={()=>{setLoading(true);setError('');setAttempt(n=>n+1);}}>Retry latest details</button></div>:current&&<>
      <p className="pixel-kicker">{discoveryProvenance(current)}</p><h2>{current.title}</h2><p>{discoveryTime(current)}</p><p>{current.venue||'Venue not listed'}</p>
      {current.description&&<p>{current.description}</p>}<p>{current.priceType==='free'?(current.kind==='crumb'?'Reported free':'Free admission'):current.priceText||'Admission not listed'}</p>
      {source&&<a className="pixel-button" href={source} target="_blank" rel="noopener noreferrer">View original source ↗</a>}
      {current.kind==='crumb'&&<p className="fine-print">A community report. Full Loaf means community corroborated.</p>}
    </>}
  </div>;
}
