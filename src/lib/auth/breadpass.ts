// Pure BreadPass helpers shared by the proxy, routes, and tests.
export const AUTH0_ENV = ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_SECRET", "APP_BASE_URL"] as const;

export function isAuth0Configured(env: Record<string, string | undefined> = process.env) {
  return AUTH0_ENV.every((key) => Boolean(env[key]));
}

// Only same-site paths; rejects absolute and protocol-relative URLs.
export function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

// Auth0 Universal Login with the passwordless email connection, returning through the Supabase bridge.
export function breadPassLoginUrl(next: unknown = "/", options: { fresh?: boolean } = {}) {
  const params = new URLSearchParams({ connection: "email", returnTo: `/breadpass?next=${encodeURIComponent(safeNext(next))}` });
  if (options.fresh) params.set("prompt", "login");
  return `/auth/login?${params}`;
}

// Auth0 owns these paths; /auth/confirm remains the Supabase email-link callback.
export function isAuth0Route(pathname: string) {
  return pathname.startsWith("/auth/") && pathname !== "/auth/confirm";
}
