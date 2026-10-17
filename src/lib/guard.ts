import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import { normalizeUfEmail, canAct } from "@/lib/auth/rules";

// Future write routes must call this before using the service client.
export async function assertCanAct(request?: Request) {
  const authorization = request?.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (authorization && !token) throw new Response("Invalid authorization header", { status: 401 });
  const config = getSupabaseConfig();
  if (token && !config) throw new Response("Authentication is not configured", { status: 503 });
  // Mobile uses bearer tokens; web uses SSR session cookies.
  const supabase = token && config ? createSupabaseClient(config.url, config.key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  }) : await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !user.email_confirmed_at || !normalizeUfEmail(user.email)) {
    throw new Response("Confirmed UF login required", { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("banned, suspended_until").eq("id", user.id).single();
  if (profileError || !canAct(profile)) throw new Response("Account cannot perform this action", { status: 403 });
  return { user, supabase };
}
