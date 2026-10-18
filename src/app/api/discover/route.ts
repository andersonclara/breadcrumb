import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/env";
import { createSearch } from "@/lib/ai/ask/search";
import { defaultConstraints } from "@/lib/ai/ask/schema";
import { timeWindow } from "@/lib/ai/ask/time";
import { mobileApi, mobileOptions } from "@/lib/mobile-api";
import { resolveDiscoveryLocation } from "@breadcrumb/shared";

export const runtime = "nodejs";
const query = z.object({
  period: z.enum(["now", "today", "tonight", "next7days"]).default("next7days"),
  kind: z.enum(["event", "crumb"]).optional(),
  id: z.uuid().optional(),
});
// Public, bounded retrieval, using exactly the publication/RLS rules used by Ask.
// This route neither invokes a model nor reads private world/profile/presence data.
async function discover(request: Request) {
  const parsed = query.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success || Boolean(parsed.data.id) !== Boolean(parsed.data.kind))
    return Response.json(
      { error: "Choose a valid discovery or time filter." },
      { status: 400 },
    );
  const config = getSupabaseConfig();
  if (!config)
    return Response.json(
      { error: "Campus discoveries are unavailable. Please try again later." },
      { status: 503 },
    );
  try {
    const p = parsed.data,
      signal = AbortSignal.any([request.signal, AbortSignal.timeout(12000)]);
    const db = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const constraints = {
      ...defaultConstraints,
      time: { period: p.period, date: null },
      kind: p.kind
        ? p.kind === "event"
          ? ("events" as const)
          : ("crumbs" as const)
        : ("all" as const),
    };
    const window = timeWindow(constraints.time, new Date());
    const refs =
      p.id && p.kind
        ? {
            constraints,
            results: [{ kind: p.kind, id: p.id }],
            referencePlace: null,
          }
        : undefined;
    const records = await createSearch(db, signal).search(
      constraints,
      window,
      null,
      refs,
    );
    return Response.json(
      { records: records.map(resolveDiscoveryLocation), window },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not load campus discoveries. Please try again." },
      { status: 503 },
    );
  }
}
export const GET = mobileApi(discover);
export const OPTIONS = mobileOptions;
