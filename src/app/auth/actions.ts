"use server";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/env";
import { normalizeUfEmail } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";
import {passwordLogin} from '@/lib/auth/password';

export type LoginState = { message: string; sent: boolean };
export async function signInPassword(_previous:LoginState,formData:FormData):Promise<LoginState>{
 if(!getSupabaseConfig())return {message:'Sign-in will be available once Supabase is connected.',sent:false};
 let result;
 try{result=await passwordLogin(await createClient(),formData.get('identifier'),formData.get('password'));}catch{return {message:'Could not connect. Please try again.',sent:false};}
 if(result.error)return {message:result.error,sent:false};
 redirect(result.next!);
}
export async function createUfAccount(previous:LoginState,formData:FormData):Promise<LoginState>{
 return sendMagicLink(previous,formData);
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
