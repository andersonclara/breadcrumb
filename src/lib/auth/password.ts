import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {normalizeUfLogin,normalizeUfEmail,signupPasswordError} from '@breadcrumb/shared';
import {createAdminClient} from '@/lib/supabase/admin';
import {auth0Authenticate,auth0Config,auth0Signup,SLICE_MESSAGE} from '@/lib/auth/auth0';
import {checkSlice,loafSecret,mintSliceToken} from '@/lib/auth/loaf';
import {AccountLinkError,openSupabaseSession} from '@/lib/auth/bridge';

async function nextPath(client:SupabaseClient,userId:string){
 const {data:profile}=await client.from('profiles').select('account_completed,avatar_completed').eq('id',userId).single();
 return !profile?.account_completed||!profile.avatar_completed?'/profile?setup=1':'/';
}

export async function passwordLogin(client:SupabaseClient,identifier:unknown,password:unknown,ip?:string|null){
 const login=normalizeUfLogin(identifier);
 if(!login||typeof password!=='string'||!password||password.length>128)return {error:'Email/username or password is incorrect.'};
 let email=login;
 if(!login.includes('@')){
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return {error:'Username sign-in is not configured yet. Please use your UF email address.'};
  const {data,error}=await createAdminClient().rpc('login_email_for_username',{p_username:login});
  if(error)return {error:'Username sign-in is unavailable. Please use your UF email address.'};
  if(!data||!normalizeUfEmail(data))return {error:'Email/username or password is incorrect.'};
  email=data;
 }
 // Auth0 owns passwords when configured; the Supabase session is opened only after Auth0 accepts.
 if(auth0Config()){
  const identity=await auth0Authenticate(email,password,ip);
  if(!('error' in identity)){
   try{
    const {session,userId}=await openSupabaseSession(client,identity,{legacyPassword:password});
    return {session,next:await nextPath(client,userId)};
   }catch(e){if(!(e instanceof AccountLinkError))throw e;}
  }else if(identity.code!=='invalid_grant')return {error:identity.error};
  // Accounts created before Auth0 still sign in with their original Supabase password.
 }
 const {data,error}=await client.auth.signInWithPassword({email,password});
 if(error||!data.user||!data.session)return {error:error?.code==='email_not_confirmed'?'Confirm your UF email before signing in.':'Email/username or password is incorrect.'};
 if(!normalizeUfEmail(data.user.email)||!data.user.email_confirmed_at){await client.auth.signOut();return {error:'A confirmed UF email address is required.'};}
 return {session:data.session,next:await nextPath(client,data.user.id)};
}

// Auth0 sign-up with a @ufl.edu address, username, and password. No email is sent, so ownership
// of the address is not verified (accepted hackathon limitation; see docs/AUTH.md).
export async function createAuth0Account(client:SupabaseClient,input:{email:unknown;username:unknown;password:unknown;confirm:unknown;loafChallenge?:unknown;loafTrace?:unknown},ip?:string|null){
 const email=normalizeUfEmail(input.email);
 if(!email)return {error:'Use your @ufl.edu email address.'};
 const username=normalizeUfLogin(input.username);
 if(!username||username.includes('@'))return {error:'Use 3–30 letters, numbers, dots, underscores, or hyphens for your username.'};
 const passwordError=signupPasswordError(input.password,input.confirm);
 if(passwordError)return {error:passwordError};
 const password=input.password as string;
 // BreadPass human check: only when LOAF_SECRET is set (the Auth0 Action then requires the token).
 const secret=loafSecret();
 if(secret&&!checkSlice(secret,input.loafChallenge,input.loafTrace).ok)return {error:SLICE_MESSAGE};
 const sliceToken=secret?mintSliceToken(secret,email):null;
 const taken=await createAdminClient().rpc('login_email_for_username',{p_username:username});
 if(taken.error){console.error(`Username availability check failed: ${taken.error.code ?? 'unknown'}`);return {error:'Could not check that username. Please try again.'};}
 if(taken.data&&taken.data!==email)return {error:'That username is taken.'};
 const signup=await auth0Signup(email,password,sliceToken);
 if(signup.error)return {error:signup.error};
 const identity=await auth0Authenticate(email,password,ip);
 if('error' in identity)return {error:identity.error};
 let session;
 try{({session}=await openSupabaseSession(client,identity,{legacyPassword:password}));}
 catch(e){if(e instanceof AccountLinkError)return {error:'This UF email already has a Breadcrumb account. Log in with its existing password instead.'};throw e;}
 const {error}=await client.rpc('complete_account',{p_username:username});
 // The account exists either way; a username problem is fixable on the profile setup page.
 if(error)console.error(`complete_account after Auth0 signup failed: ${error.code ?? 'unknown'}`);
 return {session,next:'/profile?setup=1'};
}
