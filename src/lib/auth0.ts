import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { isAuth0Configured } from "@/lib/auth/breadpass";

// Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET and APP_BASE_URL.
// Null when BreadPass is not configured, so the Supabase email-link fallback keeps working.
export const auth0 = isAuth0Configured()
  ? new Auth0Client({ authorizationParameters: { scope: "openid profile email" } })
  : null;
