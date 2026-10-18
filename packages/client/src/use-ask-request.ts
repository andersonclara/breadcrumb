import {useCallback,useEffect,useRef,useState} from 'react';
import {AskServiceError,readAskResponse} from '@breadcrumb/shared';

// One cancellable request at a time. A stopped request can never overwrite a
// newer conversation, even if a native permission/location operation finishes late.
export function useAskRequest() {
  const active=useRef<AbortController|null>(null);
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  const [retryAt,setRetryAt]=useState(0),[now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    if(!retryAt)return;
    const timer=setInterval(()=>{const current=Date.now();setNow(current);if(current>=retryAt)setRetryAt(0);},1000);
    return()=>clearInterval(timer);
  },[retryAt]);
  useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
  const cancel=useCallback(()=>{
    active.current?.abort();active.current=null;setPending(false);
  },[]);
  const run=async(task:(signal:AbortSignal)=>Promise<Response>)=>{
    if(active.current||Date.now()<retryAt)return;
    const controller=new AbortController();active.current=controller;
    setPending(true);setError('');
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;controller.abort();},30000);
    try {
      // Race also bounds native location/permission promises that ignore abort.
      const result=await Promise.race([
        task(controller.signal).then(readAskResponse),
        new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true})),
      ]);
      if(active.current===controller&&!controller.signal.aborted)return result;
    }catch(err){
      if(active.current===controller&&(!controller.signal.aborted||timedOut)){
        setError(timedOut?'The search took too long. Please retry.':err instanceof Error?err.message:'Could not connect. Please retry.');
        if(err instanceof AskServiceError&&err.retryAt){setRetryAt(err.retryAt);setNow(Date.now());}
      }
    }finally{
      clearTimeout(timer);
      if(active.current===controller){active.current=null;setPending(false);}
    }
  };
  return {run,cancel,pending,error,setError,retrySeconds:Math.max(0,Math.ceil((retryAt-now)/1000))};
}
