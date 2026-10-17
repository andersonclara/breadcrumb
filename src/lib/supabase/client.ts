"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured. See .env.example.");
  return createBrowserClient(config.url, config.key);
}
