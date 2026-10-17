import 'server-only';
import {randomBytes} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createAdminClient} from '@/lib/supabase/admin';

// After Auth0 accepts a password, open the matching Supabase session so RLS, RPCs, and Realtime
// keep using auth.uid(). generateLink sends no email; its token is redeemed immediately.
export async function openSupabaseSession(client:SupabaseClient,{email,sub}:{email:string;sub:string}){
 const admin=createAdminClient();
 // The random Supabase password is never shown or used to sign in; complete_account() requires one.
 const created=await admin.auth.admin.createUser({email,email_confirm:true,password:randomBytes(32).toString('base64url'),app_metadata:{auth0_sub:sub}});
 if(created.error&&created.error.code!=='email_exists')throw created.error;
 const link=await admin.auth.admin.generateLink({type:'magiclink',email});
 if(link.error)throw link.error;
 const {user,properties}=link.data;
 if(user.app_metadata?.auth0_sub!==sub){
  const updated=await admin.auth.admin.updateUserById(user.id,{app_metadata:{...user.app_metadata,auth0_sub:sub}});
  if(updated.error)throw updated.error;
 }
 const verified=await client.auth.verifyOtp({token_hash:properties.hashed_token,type:'magiclink'});
 if(verified.error||!verified.data.session)throw verified.error??new Error('No session returned');
 return {session:verified.data.session,userId:user.id};
}
