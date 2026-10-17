import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {normalizeUfLogin,normalizeUfEmail} from '@breadcrumb/shared';
import {createAdminClient} from '@/lib/supabase/admin';
export async function passwordLogin(client:SupabaseClient,identifier:unknown,password:unknown){
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
 const {data,error}=await client.auth.signInWithPassword({email,password});
 if(error||!data.user||!data.session)return {error:error?.code==='email_not_confirmed'?'Confirm your UF email before signing in.':'Email/username or password is incorrect.'};
 if(!normalizeUfEmail(data.user.email)||!data.user.email_confirmed_at){await client.auth.signOut();return {error:'A confirmed UF email address is required.'};}
 const {data:profile}=await client.from('profiles').select('account_completed,avatar_completed').eq('id',data.user.id).single();
 return {session:data.session,next:!profile?.account_completed||!profile.avatar_completed?'/profile?setup=1':'/'};
}
