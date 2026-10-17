"use client";
import {createClient} from '@/lib/supabase/client';
import {getSupabaseConfig} from '@/lib/env';
export const worldClient=getSupabaseConfig()?createClient():null;
export async function worldAction(action:string,data:unknown={}) {
 const response=await fetch('/api/world',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data})});
 const result=await response.json().catch(()=>({error:'Please sign in to continue.'}));
 if(!response.ok)throw new Error(result.error??'Please sign in to continue.');
 return result as {ok:boolean;id?:string;grouped?:boolean};
}
