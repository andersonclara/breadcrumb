import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getSupabaseConfig } from "@/lib/env";
import { normalizeUfEmail } from "@/lib/auth/rules";
import { breadPassLoginUrl, safeNext } from "@/lib/auth/breadpass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function go(path: string, request: NextRequest) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// Bridge: a verified Auth0 BreadPass session becomes the matching Supabase session,
// so existing RLS, RPCs, and Realtime keep using auth.uid() unchanged.
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!auth0 || !getSupabaseConfig()) return go("/login?error=breadpass", request);
  const session = await auth0.getSession();
  if (!session) return go(breadPassLoginUrl(next), request);
  const email = normalizeUfEmail(session.user.email);
  if (!email || session.user.email_verified !== true) return go("/login?error=not-uf", request);
  try {
    const admin = createAdminClient();
    const sub = session.user.sub;
    const created = await admin.auth.admin.createUser({ email, email_confirm: true, app_metadata: { auth0_sub: sub } });
    if (created.error && created.error.code !== "email_exists") throw created.error;
    // generateLink does not send an email; the hashed token is redeemed right here.
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) throw link.error;
    const { user, properties } = link.data;
    if (user.app_metadata?.auth0_sub !== sub) {
      const updated = await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, auth0_sub: sub } });
      if (updated.error) throw updated.error;
    }
    const supabase = await createClient();
    const verified = await supabase.auth.verifyOtp({ token_hash: properties.hashed_token, type: "magiclink" });
    if (verified.error) throw verified.error;
    const { data: profile } = await supabase.from("profiles").select("avatar_completed").eq("id", user.id).single();
    return go(profile?.avatar_completed ? next : "/avatar", request);
  } catch (error) {
    console.error("BreadPass bridge failed", error instanceof Error ? error.message : error);
    return go("/login?error=breadpass", request);
  }
}
