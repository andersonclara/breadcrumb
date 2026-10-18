import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyWorld, type World } from "@breadcrumb/shared";
import { activeWorld, reconcileWorld } from './world-state';
export {useAskRequest} from './use-ask-request';

export function useWorld(
  client: SupabaseClient | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [world, setWorld] = useState<World>(emptyWorld),
    [error, setError] = useState(
      client ? "" : "Campus updates are unavailable. Try again later.",
    ),
    [loading, setLoading] = useState(!!client),
    [refreshing, setRefreshing] = useState(false),
    [updatedAt, setUpdatedAt] = useState<number | null>(null),
    [now, setNow] = useState(() => Date.now());
  const epoch = useRef(0),
    mounted = useRef(true),
    flight = useRef<{
      scope: number;
      promise: Promise<World | undefined>;
      controller: AbortController;
    } | null>(null);
  const refresh = useCallback(() => {
    if (!client) return Promise.resolve<World | undefined>(undefined);
    const scope = epoch.current;
    if (flight.current?.scope === scope) return flight.current.promise;
    const controller = new AbortController();
    setRefreshing(true);
    const promise = (async () => {
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const { data, error: readError } = await client
          .rpc("pixel_world")
          .abortSignal(controller.signal);
        if (!mounted.current || scope !== epoch.current) return;
        if (
          readError ||
          !data ||
          !Array.isArray(data.crumbs) ||
          !Array.isArray(data.presence)
        )
          throw new Error("unavailable");
        const next = data as World;
        setWorld((previous) => reconcileWorld(previous, next));
        setUpdatedAt(Date.now());
        setNow(Date.now());
        setError("");
        return next;
      } catch {
        if (mounted.current && scope === epoch.current)
          setError(
            "Campus updates could not refresh. Check your connection and retry.",
          );
      } finally {
        clearTimeout(timeout);
        if (mounted.current && scope === epoch.current) {
          setLoading(false);
          setRefreshing(false);
        }
        if (flight.current?.controller === controller) flight.current = null;
      }
    })();
    flight.current = { scope, promise, controller };
    return promise;
  }, [client]);
  const cancel = useCallback(() => {
    mounted.current = false;
    epoch.current++;
    flight.current?.controller.abort();
    flight.current = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    const { data: listener } = client?.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      epoch.current++;
      flight.current?.controller.abort();
      flight.current = null;
      setWorld(emptyWorld);
      setUpdatedAt(null);
      setLoading(!!client);
      void Promise.resolve().then(refresh);
    }) ?? { data: null };
    return () => {
      cancel();
      listener?.subscription.unsubscribe();
    };
  }, [client, refresh, cancel]);
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [enabled, refresh]);
  const visibleWorld = useMemo(() => activeWorld(world, now), [world, now]);
  return {
    world: visibleWorld,
    error,
    loading,
    refreshing,
    updatedAt,
    refresh,
  };
}
