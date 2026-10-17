import 'server-only';
import {normalizeUfEmail} from '@breadcrumb/shared';

// Auth0 owns Breadcrumb passwords. The server calls Auth0's database-connection APIs directly so the
// pixel login form stays in the app; no hosted login page or Auth0 session cookie is involved.
export function auth0Config(env:Record<string,string|undefined>=process.env){
 const domain=env.AUTH0_DOMAIN?.trim(),clientId=env.AUTH0_CLIENT_ID?.trim(),clientSecret=env.AUTH0_CLIENT_SECRET?.trim();
 if(!domain||!clientId||!clientSecret)return null;
 return {domain:domain.replace(/^https?:\/\//,'').replace(/\/+$/,''),clientId,clientSecret,connection:env.AUTH0_DB_CONNECTION?.trim()||'Username-Password-Authentication'};
}
type Auth0Error={code?:string;error?:string;name?:string;description?:unknown;error_description?:string;message?:string};
type PolicyRule={message?:string;format?:unknown[];verified?:boolean;items?:PolicyRule[]};
// Auth0's PasswordStrengthError describes the policy as {rules:[{message:'At least %d characters', format:[8], verified}]}.
export function passwordPolicyMessage(description:unknown):string{
 if(typeof description==='string')return `Choose a stronger password: ${description}`;
 const rules=(description as {rules?:PolicyRule[]}|null)?.rules;
 if(!Array.isArray(rules))return 'Choose a stronger password.';
 const fill=(rule:PolicyRule)=>{let i=0;return (rule.message??'').replace(/%d/g,()=>String(rule.format?.[i++]??''));};
 const missing=rules.filter(rule=>!rule.verified).map(rule=>{
  const items=rule.items?.filter(item=>!item.verified).map(fill).filter(Boolean)??[];
  return items.length?`${fill(rule)} ${items.join(', ')}`:fill(rule);
 }).filter(Boolean);
 return missing.length?`Choose a stronger password. It needs: ${missing.join('; ')}.`:'Choose a stronger password.';
}
const generic='Could not reach the account service. Please try again.';
async function call(path:string,init:{body:unknown;headers?:Record<string,string>}){
 const config=auth0Config();if(!config)throw new Error('Auth0 is not configured.');
 const response=await fetch(`https://${config.domain}${path}`,{method:'POST',headers:{'Content-Type':'application/json',...init.headers},body:JSON.stringify(init.body),cache:'no-store'});
 const data=await response.json().catch(()=>({})) as Auth0Error&Record<string,unknown>;
 return {ok:response.ok,status:response.status,data};
}
// Plain strings: the dev log file drops logged objects. Never include passwords or emails.
const log=(step:string,status:number,data:Auth0Error)=>console.error(`Auth0 ${step} failed: HTTP ${status} ${data.code??data.error??data.name??'unknown'}`);

export const SLICE_MESSAGE='Slice the loaf to prove you’re human.';
export async function auth0Signup(email:string,password:string,sliceToken?:string|null):Promise<{error?:string}>{
 const config=auth0Config();if(!config)return {error:generic};
 // The Pre User Registration Action re-verifies loaf_slice (auth0/actions/pre-user-registration.cjs).
 const {ok,status,data}=await call('/dbconnections/signup',{body:{client_id:config.clientId,email,password,connection:config.connection,...(sliceToken?{user_metadata:{loaf_slice:sliceToken}}:{})}});
 if(ok)return {};
 log('signup',status,data);
 const code=data.code??data.name??'',text=`${data.description??data.message??''}`;
 if(code==='no_loaf'||/slice the loaf/i.test(text))return {error:SLICE_MESSAGE};
 if(code==='invalid_signup'||code==='user_exists'||/already exists/i.test(text))return {error:'An account with this UF email already exists. Log in instead.'};
 if(code==='invalid_password'||code==='PasswordStrengthError'||code==='PasswordDictionaryError'||code==='PasswordNoUserInfoError')return {error:passwordPolicyMessage(data.description)};
 if(code==='extensibility_error'||code==='not_uf')return {error:'Use your @ufl.edu email.'};
 return {error:generic};
}

// The student's IP for Auth0 brute-force protection. x-forwarded-for is client-controlled unless a
// trusted proxy overwrites it (Vercel does), so it is only used there; elsewhere Auth0 sees the server IP.
export function trustedClientIp(headers:Headers,env:Record<string,string|undefined>=process.env){
 if(env.VERCEL!=='1')return null;
 return headers.get('x-forwarded-for')?.split(',')[0]?.trim()||null;
}

export async function auth0Authenticate(email:string,password:string,ip?:string|null):Promise<{sub:string;email:string}|{error:string;code?:string}>{
 const config=auth0Config();if(!config)return {error:generic};
 // Lets Auth0 brute-force protection see the student's IP instead of the server's
 // (requires "Trust Token Endpoint IP Header" on the Auth0 application).
 const headers:Record<string,string>=ip?{'auth0-forwarded-for':ip}:{};
 const token=await call('/oauth/token',{headers,body:{grant_type:'http://auth0.com/oauth/grant-type/password-realm',realm:config.connection,client_id:config.clientId,client_secret:config.clientSecret,username:email,password,scope:'openid email'}});
 if(!token.ok){
  log('login',token.status,token.data);
  if(token.data.error==='invalid_grant')return {error:'Email/username or password is incorrect.',code:'invalid_grant'};
  if(token.data.error==='too_many_attempts')return {error:'Too many attempts. Please try again later.'};
  if(token.data.error==='unauthorized_client')console.error('Auth0 login: enable the Password grant type on the Auth0 application.');
  return {error:generic};
 }
 const access=token.data.access_token;
 if(typeof access!=='string')return {error:generic};
 const info=await fetch(`https://${config.domain}/userinfo`,{headers:{Authorization:`Bearer ${access}`},cache:'no-store'});
 const user=await info.json().catch(()=>({})) as {sub?:unknown;email?:unknown};
 if(!info.ok){console.error(`Auth0 userinfo failed: HTTP ${info.status}`);return {error:generic};}
 const ufEmail=normalizeUfEmail(user.email);
 // Only the Breadcrumb database connection; ownership of the address is not verified (see docs/AUTH.md).
 if(typeof user.sub!=='string'||!user.sub.startsWith('auth0|')||!ufEmail)return {error:'A UF (@ufl.edu) account is required.'};
 return {sub:user.sub,email:ufEmail};
}
