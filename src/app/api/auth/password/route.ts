import {createClient} from '@/lib/supabase/server';
import {passwordLogin} from '@/lib/auth/password';
import {trustedClientIp} from '@/lib/auth/auth0';
import {allowedApiOrigin,mobileApi,mobileOptions} from '@/lib/mobile-api';
async function post(request:Request){
 try{
  if(!allowedApiOrigin(request))return Response.json({error:'Invalid request origin'},{status:403});
  const raw=await request.text();if(raw.length>1500)return Response.json({error:'Invalid sign-in request'},{status:400});
  let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid sign-in request'},{status:400});}
  if(!body||typeof body!=='object')return Response.json({error:'Invalid sign-in request'},{status:400});
  const result=await passwordLogin(await createClient(),body.identifier,body.password,trustedClientIp(request.headers));
  return Response.json(result,{status:result.error?401:200,headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Could not connect. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const POST=mobileApi(post);
export const OPTIONS=mobileOptions;
