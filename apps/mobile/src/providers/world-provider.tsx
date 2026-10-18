import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { useWorld } from "@breadcrumb/client";
import {
  emptyWorld,
  inCampus,
  roundedLocation,
  type Coordinate,
  type World,
} from "@breadcrumb/shared";
import { supabase } from "@/lib/supabase";
import { worldAction } from "@/lib/world";
const Context = createContext<{
  world: World;
  error: string;
  notice: string;
  actionError: string;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<World | undefined>;
  pending: boolean;
  isPending: (action: string, id?: string) => boolean;
  sharing: boolean;
  position: Coordinate | null;
  act: (
    action: string,
    data?: unknown,
  ) => Promise<{ ok: boolean; id?: string; grouped?: boolean }>;
  share: () => Promise<void>;
  stop: () => Promise<void>;
}>({
  world: emptyWorld,
  error: "",
  notice: "",
  actionError: "",
  loading: false,
  refreshing: false,
  refresh: async () => {},
  pending: false,
  isPending: () => false,
  sharing: false,
  position: null,
  act: async () => ({ ok: false }),
  share: async () => {},
  stop: async () => {},
});
export function WorldProvider({ children }: PropsWithChildren) {
  const [foreground, setForeground] = useState(
    AppState.currentState !== "background",
  );
  const { world, error, refresh, loading, refreshing } = useWorld(supabase, {
    enabled: foreground,
  });
  const [notice, setNotice] = useState(""),
    [actionError, setActionError] = useState(""),
    [pendingKeys, setPendingKeys] = useState<string[]>([]),
    [sharing, setSharing] = useState(false),
    [position, setPosition] = useState<Coordinate | null>(null);
  const flights = useRef(new Map<string, ReturnType<typeof worldAction>>());
  const pending = pendingKeys.length > 0;
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const watcher = useRef<Location.LocationSubscription | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    current = useRef<Coordinate | null>(null),
    generation = useRef(0);
  const stop = useCallback(() => {
    const wasSharing = !!watcher.current || !!timer.current;
    generation.current++;
    watcher.current?.remove();
    watcher.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setSharing(false);
    return wasSharing
      ? worldAction("presence_stop")
          .then(() => {})
          .catch(() => {})
      : Promise.resolve();
  }, []);
  useEffect(() => {
    let identity: string | null = null;
    const listener = supabase?.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (identity && identity !== next) {
        void stop();
        setPosition(null);
      }
      identity = next;
    });
    return () => listener?.data.subscription.unsubscribe();
  }, [stop]);
  const invalidate = useCallback(() => {
    generation.current += 1;
  }, []);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") {
        const wasSharing = !!watcher.current || !!timer.current;
        invalidate();
        watcher.current?.remove();
        watcher.current = null;
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setSharing(false);
        if (wasSharing) void worldAction("presence_stop").catch(() => {});
      }
    });
    return () => {
      const wasSharing = !!watcher.current || !!timer.current;
      listener.remove();
      invalidate();
      watcher.current?.remove();
      if (timer.current) clearInterval(timer.current);
      if (wasSharing) void worldAction("presence_stop").catch(() => {});
    };
  }, [invalidate]);
  function act(action: string, data: unknown = {}) {
    const key = action + ":" + JSON.stringify(data),
      existing = flights.current.get(key);
    if (existing) return existing;
    setPendingKeys((keys) => [...keys, key]);
    setActionError("");
    setNotice("");
    const promise = worldAction(action, data)
      .then(async (result) => {
        await refresh();
        const copy: Record<string, string> = {
          create: result.grouped
            ? "Your update joined this Crumb."
            : "Your Crumb is on the map.",
          vote: "Your update was recorded.",
          report: "Report received. This Crumb is hidden from your map.",
          friend_request: "Friend request sent.",
          friend_accept: "Friend request accepted.",
          friend_remove: "Friend removed.",
          community_join: "Community joined.",
          community_leave: "Community left.",
          community_create: "Community created.",
          avatar: "Profile saved.",
        };
        setNotice(copy[action] ?? "Changes saved.");
        return result;
      })
      .catch((e) => {
        setActionError(
          e instanceof Error ? e.message : "Could not save. Please retry.",
        );
        throw e;
      })
      .finally(() => {
        flights.current.delete(key);
        setPendingKeys((keys) => keys.filter((k) => k !== key));
      });
    flights.current.set(key, promise);
    return promise;
  }
  const isPending = (action: string, id?: string) =>
    pendingKeys.some(
      (k) => k.startsWith(action + ":") && (!id || k.includes(id)),
    );
  async function share() {
    if (watcher.current || timer.current) return;
    if (!world.profile?.avatar_completed) {
      setNotice("Create and save your avatar before sharing.");
      return;
    }
    const ticket = ++generation.current;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setNotice("Location permission was not granted. Sharing remains off.");
      return;
    }
    if (ticket !== generation.current || AppState.currentState === "background")
      return;
    const publish = () => {
      if (current.current)
        void worldAction("presence", roundedLocation(current.current)).catch(
          (e) => {
            setNotice(e.message);
            stop();
          },
        );
    };
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        (location) => {
          if (ticket !== generation.current) return;
          const point = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          if (!inCampus(point)) {
            setNotice(
              "You are outside the UF campus map. Sharing was stopped.",
            );
            stop();
            return;
          }
          current.current = point;
          setPosition(point);
          setSharing(true);
          publish();
        },
      );
      if (ticket !== generation.current) {
        subscription.remove();
        return;
      }
      watcher.current = subscription;
      timer.current = setInterval(publish, 20000);
    } catch {
      setNotice("Could not find your location. Sharing remains off.");
      stop();
    }
  }
  return (
    <Context.Provider
      value={{
        world,
        error,
        notice,
        actionError,
        loading,
        refreshing,
        refresh,
        pending,
        isPending,
        sharing,
        position,
        act,
        share,
        stop,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCampus() {
  return useContext(Context);
}
