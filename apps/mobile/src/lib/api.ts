import { supabase } from "./supabase";
import Constants from "expo-constants";

declare const __DEV__: boolean;

const publicAuthEndpoints = new Set([
  "/api/auth/password", "/api/auth/signup", "/api/auth/loaf", "/api/auth/reset-password",
]);

// Future mobile writes call the same Next.js endpoints as the web app.
export async function apiFetch(path: `/api/${string}`, init: RequestInit = {}) {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const metroHost = Constants.expoConfig?.hostUri?.split(":")[0];
  const base =
    __DEV__ && configured && metroHost
      ? configured
          .replace("localhost", metroHost)
          .replace("127.0.0.1", metroHost)
      : configured;
  if (!base)
    throw new Error("Campus services are unavailable. Please try again later.");
  if (!path.startsWith("/api/") || path.includes("..") || path.includes("\\"))
    throw new Error("Invalid API path.");
  const url = new URL(path, base);
  if (url.origin !== new URL(base).origin)
    throw new Error("Invalid API origin.");
  const headers = new Headers(init.headers);
  // These endpoints authenticate credentials or issue a public challenge. They
  // must not wait for an existing Supabase session to refresh before fetching.
  const publicAuth = publicAuthEndpoints.has(path);
  if (supabase && !publicAuth) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Please sign in again.");
    if (data.session)
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, path === "/api/auth/loaf" ? 8000 : path === "/api/ask" || publicAuth ? 30000 : 15000);
  try {
    return await fetch(url.toString(), {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (e) {
    if (controller.signal.aborted && !init.signal?.aborted)
      throw new Error(publicAuth ? "Could not reach sign-in services. Check your connection and retry." : "The request took too long. Please retry.");
    if (publicAuth && !init.signal?.aborted)
      throw new Error("Could not reach sign-in services. Check your connection and retry.");
    throw e;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abort);
  }
}
