import {normalizeUfEmail} from '@breadcrumb/shared/email';
import {auth0Config,auth0ResetPassword} from '@/lib/auth/auth0';
import {allowedApiOrigin,mobileApi,mobileOptions} from '@/lib/mobile-api';

async function post(request:Request){
 try{
  if(!allowedApiOrigin(request))return Response.json({error:'Invalid request origin'},{status:403});
  const raw=await request.text();
  if(raw.length>1000)return Response.json({error:'Invalid request'},{status:400});
  let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Invalid request'},{status:400});}
  const email=normalizeUfEmail(body?.email);
  if(!email)return Response.json({error:'Use your @ufl.edu email address.'},{status:400});
  if(!auth0Config())return Response.json({error:'Password reset is temporarily unavailable. Please try again later.'},{status:503});
  const result=await auth0ResetPassword(email);
  return Response.json(result.error?result:{message:'If this address has an account, a password reset link has been sent. Check your UF inbox.'},{status:result.error?503:200,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not send a password reset. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const POST=mobileApi(post);
export const OPTIONS=mobileOptions;
