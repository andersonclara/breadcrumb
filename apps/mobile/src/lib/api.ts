import { supabase } from "./supabase";

// Future mobile writes call the same Next.js endpoints as the web app.
export async function apiFetch(path: `/api/${string}`, init: RequestInit = {}) {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) throw new Error("The server URL is not configured.");
  if (!path.startsWith("/api/") || path.includes("..") || path.includes("\\")) throw new Error("Invalid API path.");
  const url = new URL(path, base);
  if (url.origin !== new URL(base).origin) throw new Error("Invalid API origin.");
  const headers = new Headers(init.headers);
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Please sign in again.");
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  return fetch(url.toString(), { ...init, headers });
}
