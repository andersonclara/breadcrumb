import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { auth0 } from "@/lib/auth0";
import { isAuth0Route } from "@/lib/auth/breadpass";

export async function proxy(request: NextRequest) {
  // Auth0 mounts /auth/login, /auth/callback, /auth/logout, and rolls its session cookie.
  const authResponse = auth0 ? await auth0.middleware(request) : null;
  if (authResponse && isAuth0Route(request.nextUrl.pathname)) return authResponse;
  const config = getSupabaseConfig();
  if (!config) return authResponse ?? NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  // With BreadPass on, a Supabase session only lives as long as the Auth0 session behind it.
  if (auth0 && data?.claims && !(await auth0.getSession(request))) await supabase.auth.signOut({ scope: "local" });
  authResponse?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
