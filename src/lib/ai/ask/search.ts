import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {placeSchema,recordSchema,type Constraints,type Place,type DiscoveryRecord,type AskRequest} from './schema';

export function publicSourceUrl(value:string|null) {
  if(!value)return null;
  try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}
  catch{return null;}
}
export function createSearch(db:SupabaseClient,signal:AbortSignal) {
  async function rpc(name:string,args:Record<string,unknown>) {
    const {data,error}=await db.rpc(name,args).abortSignal(signal);
    if(error)throw new Error('ask_storage_unavailable');
    return data;
  }
  return {
    async places(query:string) {return z.array(placeSchema).max(5).parse(await rpc('ask_places',{p_query:query}));},
    async search(constraints:Constraints,window:{start:string;end:string},origin:Place|null,refs?:AskRequest['context']) {
      const p={...window,nowOnly:constraints.time.period==='now',terms:constraints.terms,categories:constraints.categories,
        freeOnly:constraints.freeOnly,latitude:origin?.latitude??null,longitude:origin?.longitude??null,radius:constraints.radiusMeters};
      const kinds=constraints.kind==='all'?['events','crumbs']:[constraints.kind];
      const results=await Promise.all(kinds.map(async kind=>{
        const ids=refs?.results.filter(r=>r.kind===(kind==='events'?'event':'crumb')).map(r=>r.id);
        if(ids&&ids.length===0)return [];
        return z.array(recordSchema).max(20).parse(await rpc(`ask_search_${kind}`,{p:{...p,...(ids?{ids}:{})}}));
      }));
      return results.flat().filter(r=>r.kind==='crumb'||publicSourceUrl(r.sourceUrl)).map(r=>({...r,
        sourceUrl:publicSourceUrl(r.sourceUrl),title:r.title.slice(0,180),description:r.description?.slice(0,1000)??null,
      }));
    },
  };
}
export function rankRecords(records:DiscoveryRecord[],terms:string[]=[]) {
  // Deterministic order: proximity if known, then fresh/corroborated reports,
  // then upcoming starts. Duplicate announcements retain separate storage.
  const sorted=[...records].sort((a,b)=>{
    if(a.distanceMeters!==null&&b.distanceMeters!==null&&a.distanceMeters!==b.distanceMeters)return a.distanceMeters-b.distanceMeters;
    const relevance=(r:DiscoveryRecord)=>terms.reduce((score,term)=>{
      const words=term.toLowerCase().split(/\s+/).filter(Boolean);
      return score+words.reduce((sum,word)=>sum+(r.title.toLowerCase().includes(word)?3:0)+(r.description?.toLowerCase().includes(word)?1:0),0);
    },0);
    if(relevance(a)!==relevance(b))return relevance(b)-relevance(a);
    const score=(r:DiscoveryRecord)=>r.kind==='crumb'?Math.min(r.confirmCount,3)-r.disputeCount:0;
    const timeOrder=a.kind===b.kind?(a.kind==='crumb'
      ?Date.parse(b.createdAt??'')-Date.parse(a.createdAt??'')
      :Date.parse(a.startsAt??'')-Date.parse(b.startsAt??'')):(a.kind==='crumb'?-1:1);
    return score(b)-score(a)||timeOrder||a.id.localeCompare(b.id);
  });
  const seen=new Set<string>();
  return sorted.filter(r=>{
    const key=r.kind==='event'?JSON.stringify([r.title.toLowerCase().replace(/[^a-z0-9]/g,''),r.startsAt,r.venue?.toLowerCase()]):r.id;
    if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,4);
}
