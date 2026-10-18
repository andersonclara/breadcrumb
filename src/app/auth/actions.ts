"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/env";
import { normalizeUfEmail } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";
import {createAuth0Account,passwordLogin} from '@/lib/auth/password';
import {auth0Config,trustedClientIp} from '@/lib/auth/auth0';

export type LoginState = { message: string; sent: boolean };
// Forwarded to Auth0 for per-student brute-force protection, only where the header is trustworthy.
async function clientIp(){return trustedClientIp(await headers());}
export async function signInPassword(_previous:LoginState,formData:FormData):Promise<LoginState>{
 if(!getSupabaseConfig())return {message:'Sign-in will be available once Supabase is connected.',sent:false};
 let result;
 try{result=await passwordLogin(await createClient(),formData.get('identifier'),formData.get('password'),await clientIp());}catch{return {message:'Could not connect. Please try again.',sent:false};}
 if(result.error)return {message:result.error,sent:false};
 redirect(result.next!);
}
export async function createUfAccount(previous:LoginState,formData:FormData):Promise<LoginState>{
 if(!getSupabaseConfig()||!auth0Config())return sendMagicLink(previous,formData);
 let result;
 const rawTrace=formData.get('loafTrace');let loafTrace:unknown=null;
 if(typeof rawTrace==='string'&&rawTrace.length<=20000){try{loafTrace=JSON.parse(rawTrace);}catch{}}
 try{result=await createAuth0Account(await createClient(),{email:formData.get('email'),username:formData.get('username'),password:formData.get('password'),confirm:formData.get('confirm'),loafChallenge:formData.get('loafChallenge'),loafTrace},await clientIp());}catch{return {message:'Could not create your account. Please try again.',sent:false};}
 if(result.error)return {message:result.error,sent:false};
 redirect(result.next!);
}
export async function sendMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeUfEmail(formData.get("email"));
  if (!email) return { message: "Enter your @ufl.edu email address.", sent: false };
  if (!getSupabaseConfig()) return { message: "Sign-in will be available once Supabase is connected.", sent: false };
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return { message: "The app's sign-in URL has not been configured.", sent: false };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser:true,emailRedirectTo: new URL("/auth/confirm", site).toString() } });
  if (error) return { message: "We couldn't send a link. Please wait a minute and try again.", sent: false };
  return { message: "Check your UF inbox to verify your email. Then choose your username and password.", sent: true };
}

export async function signOut() {
 if(getSupabaseConfig()){const supabase=await createClient();await supabase.auth.signOut();}
 redirect("/");
}
