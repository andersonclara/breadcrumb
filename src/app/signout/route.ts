import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Ends the Supabase session, then the Auth0 BreadPass session when it is enabled.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new Response("Invalid request origin", { status: 403 });
  if (getSupabaseConfig()) { const supabase = await createClient(); await supabase.auth.signOut(); }
  const response = NextResponse.redirect(new URL(auth0 ? "/auth/logout" : "/", request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
