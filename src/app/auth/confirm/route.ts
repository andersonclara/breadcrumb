import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { normalizeUfEmail } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const result = tokenHash && ["email", "magiclink", "signup"].includes(type ?? "")
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "magiclink" | "signup" })
      : code ? await supabase.auth.exchangeCodeForSession(code) : null;
    if (result && !result.error && normalizeUfEmail(result.data.user?.email)) {
      const {data:profile}=await supabase.from("profiles").select("account_completed,avatar_completed").eq("id",result.data.user!.id).single();
      const response = NextResponse.redirect(new URL(!profile?.account_completed||!profile.avatar_completed?"/profile?setup=1":"/", request.url));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/login?error=invalid-link", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
