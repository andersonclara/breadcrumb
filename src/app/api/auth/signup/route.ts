import {createClient} from '@/lib/supabase/server';
import {createAuth0Account} from '@/lib/auth/password';
import {auth0Config,trustedClientIp} from '@/lib/auth/auth0';
// Mobile sign-up. Returns {mode:'email'} when Auth0 is off so the app keeps its email-code flow.
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
  if(!auth0Config())return Response.json({mode:'email'},{headers:{'Cache-Control':'no-store'}});
  const raw=await request.text();if(raw.length>2000)return Response.json({error:'Invalid sign-up request'},{status:400});
  let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid sign-up request'},{status:400});}
  if(!body||typeof body!=='object')return Response.json({error:'Invalid sign-up request'},{status:400});
  const ip=trustedClientIp(request.headers);
  const result=await createAuth0Account(await createClient(),{email:body.email,username:body.username,password:body.password,confirm:body.confirm},ip);
  return Response.json(result,{status:result.error?400:200,headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Could not create your account. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
