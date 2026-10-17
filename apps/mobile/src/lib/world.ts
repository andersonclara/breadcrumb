import {apiFetch} from './api';
export async function worldAction(action:string,data:unknown={}) {
 const response=await apiFetch('/api/world',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data})});
 const result=await response.json().catch(()=>({error:'Could not reach the campus server.'}));
 if(!response.ok)throw new Error(result.error??'Could not save this change.');
 return result as {ok:boolean;id?:string;grouped?:boolean};
}
