"use server";
import { getSupabaseConfig } from "@/lib/env";
import { normalizeUfEmail } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message: string; sent: boolean };
export async function sendMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeUfEmail(formData.get("email"));
  if (!email) return { message: "Enter your @ufl.edu email address.", sent: false };
  if (!getSupabaseConfig()) return { message: "Sign-in will be available once Supabase is connected.", sent: false };
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return { message: "The app's sign-in URL has not been configured.", sent: false };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: new URL("/auth/confirm", site).toString() } });
  if (error) return { message: "We couldn't send a link. Please wait a minute and try again.", sent: false };
  return { message: "Check your UF inbox for your sign-in link.", sent: true };
}
