import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normalizeUfEmail, canAct } from "@/lib/auth/rules";

// Future write routes must call this before using the service client.
export async function assertCanAct() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at || !normalizeUfEmail(user.email)) {
    throw new Response("Confirmed UF login required", { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("banned, suspended_until").eq("id", user.id).single();
  if (profileError || !canAct(profile)) throw new Response("Account cannot perform this action", { status: 403 });
  return { user, supabase };
}
