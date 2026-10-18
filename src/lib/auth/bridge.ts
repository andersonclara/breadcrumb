import 'server-only';
import {randomBytes} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createAdminClient} from '@/lib/supabase/admin';
import {getSupabaseConfig} from '@/lib/env';

// Thrown when an Auth0 identity may not take over an existing Supabase account.
export class AccountLinkError extends Error {}

// Auth0 sign-up does not verify email ownership, so an existing Supabase account is only linked when
// it already belongs to this Auth0 user, or when the caller proves its pre-Auth0 Breadcrumb password.
async function ownsLegacyPassword(email:string,password:string){
 const config=getSupabaseConfig();if(!config)return false;
 const probe=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await probe.auth.signInWithPassword({email,password});
 if(error||!data.session)return false;
 // This proof must not revoke the student's sessions on other devices.
 await probe.auth.signOut({scope:'local'});
 return !data.user?.app_metadata?.auth0_sub;
}

// After Auth0 accepts a password, open the matching Supabase session so RLS, RPCs, and Realtime
// keep using auth.uid(). generateLink sends no email; its token is redeemed immediately.
export async function openSupabaseSession(client:SupabaseClient,{email,sub}:{email:string;sub:string},options:{legacyPassword?:string}={}){
 const admin=createAdminClient();
 // The random Supabase password is never shown or used to sign in; complete_account() requires one.
 const created=await admin.auth.admin.createUser({email,email_confirm:true,password:randomBytes(32).toString('base64url'),app_metadata:{auth0_sub:sub}});
 if(created.error&&created.error.code!=='email_exists')throw created.error;
 const link=await admin.auth.admin.generateLink({type:'magiclink',email});
 if(link.error)throw link.error;
 const {user,properties}=link.data;
 const linked=user.app_metadata?.auth0_sub;
 if(linked!==sub){
  // created.error is null only when this call created the user, so it is this identity's account.
  if(created.error&&linked)throw new AccountLinkError('This UF email is linked to a different account.');
  if(created.error&&(!options.legacyPassword||!(await ownsLegacyPassword(email,options.legacyPassword))))throw new AccountLinkError('This UF email already has a Breadcrumb account.');
  const updated=await admin.auth.admin.updateUserById(user.id,{password:randomBytes(32).toString('base64url'),app_metadata:{...user.app_metadata,auth0_sub:sub}});
  if(updated.error)throw updated.error;
 }
 const verified=await client.auth.verifyOtp({token_hash:properties.hashed_token,type:'magiclink'});
 if(verified.error||!verified.data.session)throw verified.error??new Error('No session returned');
 return {session:verified.data.session,userId:user.id};
}
