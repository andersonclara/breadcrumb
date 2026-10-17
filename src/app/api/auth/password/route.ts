import {createClient} from '@/lib/supabase/server';
import {passwordLogin} from '@/lib/auth/password';
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
  const raw=await request.text();if(raw.length>1500)return Response.json({error:'Invalid sign-in request'},{status:400});
  let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid sign-in request'},{status:400});}
  if(!body||typeof body!=='object')return Response.json({error:'Invalid sign-in request'},{status:400});
  const result=await passwordLogin(await createClient(),body.identifier,body.password);
  return Response.json(result,{status:result.error?401:200,headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Could not connect. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
