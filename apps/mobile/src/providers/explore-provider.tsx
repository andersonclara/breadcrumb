import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  campus,
  crumbRecord,
  discoveryKey,
  isCurrentRecord,
  toWorld,
  type Coordinate,
  type DiscoveryPeriod,
  type DiscoveryRecord,
  type AskContext,
  type AskResult,
  type MapCamera,
  createDemoReports,
  demoRemaining,
  demoKey,
  isDemoRecord,
  type DemoSession,
} from "@breadcrumb/shared";
import { useCampus } from "./world-provider";
import { useAuth } from "./auth-provider";
import { apiFetch } from "@/lib/api";
export type Draft = {
  text: string;
  category: string;
  community: string;
  point: Coordinate | null;
  owner: string | null;
};
export type ChatTurn = { id: string; question: string; result: AskResult; demoKey?: string | null };
const initialCamera: MapCamera = {
  ...toWorld({ latitude: 29.6484, longitude: -82.3445 }),
  zoom: 12,
};
const emptyDraft: Draft = {
  text: "",
  category: "freebie",
  community: "campus",
  point: null,
  owner: null,
};
function useExploreValue() {
  const { world } = useCampus(),
    { session } = useAuth();
  const [camera, setCamera] = useState(initialCamera),
    [scope, setScope] = useState("campus"),
    [period, setPeriod] = useState<DiscoveryPeriod>("next7days"),
    [category, setCategory] = useState("all"),
    [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DiscoveryRecord | null>(null),
    [draft, setDraft] = useState<Draft>(emptyDraft),
    [resumePost, setResumePost] = useState(false);
  const [events, setEvents] = useState<DiscoveryRecord[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refreshing, setRefreshing] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]),
    [context, setContext] = useState<AskContext | undefined>(),
    [chatInput, setChatInput] = useState(""),
    [chatScroll, setChatScroll] = useState(0);
  const [demo, setDemo] = useState<DemoSession | null>(null),
    [demoSeconds, setDemoSeconds] = useState(0),
    [heatmap, setHeatmap] = useState(false);
  const endDemo = useCallback(() => {
    setDemo(null);
    setDemoSeconds(0);
    setSelected(r => r && isDemoRecord(r) ? null : r);
    setTurns(items => items.filter(turn => !turn.demoKey));
    setContext(undefined);
  }, []);
  const startDemo = () => {
    endDemo();
    setDemo({ startedAt: Date.now(), seed: 1 + Math.floor(Math.random() * 0x7ffffffe) });
    setDemoSeconds(180);
    setHeatmap(true);
    setScope('campus');
    setPeriod('now');
    setCategory('all');
    setQuery('');
    setCamera({ x: 228, y: 76, zoom: 2.3 });
  };
  useEffect(() => {
    if (!demo) return;
    const tick = () => {
      const remaining = demoRemaining(demo);
      if (!remaining) endDemo();
      else setDemoSeconds(Math.ceil(remaining / 1000));
    };
    const timer = setInterval(tick, 1000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [demo, endDemo]);
  const demoRecords = useMemo(() => demo ? createDemoReports(demo) : [], [demo]);
  const [saved, setSaved] = useState<DiscoveryRecord[]>([]),
    [savedReady, setSavedReady] = useState(false),
    [savedError, setSavedError] = useState(""),
    [loadedKey, setLoadedKey] = useState(""),
    [canPersist, setCanPersist] = useState(false),
    [savedRetry, setSavedRetry] = useState(0);
  const identity = session?.user.id ?? null,
    epoch = useRef(0),
    controller = useRef<AbortController | null>(null);
  const [owner, setOwner] = useState(identity),
    [now, setNow] = useState(() => Date.now());
  if (owner !== identity) {
    setOwner(identity);
    if (demo) endDemo();
    if (owner) {
      setDraft(emptyDraft);
      setResumePost(false);
      setSelected(null);
      setTurns([]);
      setContext(undefined);
      setChatInput("");
      setScope("campus");
    }
  }
  if (
    scope !== "campus" &&
    world.communities &&
    !world.communities.some((c) => c.id === scope && c.joined)
  )
    setScope("campus");
  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const ticket = ++epoch.current;
    setRefreshing(true);
    try {
      const response = await apiFetch(
        ("/api/discover?period=" + period) as `/api/${string}`,
        { signal: abort.signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not load discoveries.");
      if (!Array.isArray(data.records))
        throw new Error("Could not read discoveries.");
      if (ticket === epoch.current) {
        setEvents(data.records);
        setError("");
      }
    } catch (e) {
      if (ticket === epoch.current && !abort.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not load discoveries.",
        );
    } finally {
      if (ticket === epoch.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [period]);
  const cancelDiscovery = useCallback(() => {
    epoch.current++;
    controller.current?.abort();
  }, []);
  useEffect(() => {
    if(!identity)return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 60000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
      else controller.current?.abort();
    });
    return () => {
      active = false;
      cancelDiscovery();
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh, cancelDiscovery, identity]);
  const storageKey = "breadcrumb:saved:v1:" + (identity ?? "guest");
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!active) return;
        try {
          const records = value ? JSON.parse(value) : [];
          if (!Array.isArray(records)) throw new Error("invalid");
          setSaved(
            records.filter(
              (r) =>
                r &&
                typeof r.id === "string" &&
                ["event", "crumb"].includes(r.kind),
            ),
          );
          setCanPersist(true);
          setSavedError("");
        } catch {
          setSaved([]);
          setCanPersist(false);
          setSavedError(
            "Saved items could not be restored. Retry before making changes.",
          );
        }
        setLoadedKey(storageKey);
        setSavedReady(true);
      })
      .catch(() => {
        if (active) {
          setSaved([]);
          setCanPersist(false);
          setLoadedKey(storageKey);
          setSavedError("Saved items could not be restored. Please retry.");
          setSavedReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [storageKey, savedRetry]);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    if (!savedReady || !canPersist || loadedKey !== storageKey) return;
    const key = storageKey,
      value = JSON.stringify(saved);
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, value))
      .catch(() =>
        setSavedError("Your saved items could not be stored on this device."),
      );
  }, [saved, savedReady, storageKey, loadedKey, canPersist]);
  const toggleSaved = (r: DiscoveryRecord) =>
    !isDemoRecord(r) && setSaved((items) =>
      items.some((i) => discoveryKey(i) === discoveryKey(r))
        ? items.filter((i) => discoveryKey(i) !== discoveryKey(r))
        : [...items, r],
    );
  const crumbRecords = useMemo(() => world.crumbs
    .filter((c) => (c.community_id ?? "campus") === scope)
    .map(crumbRecord), [world.crumbs, scope]);
  const records = useMemo(() => {
    const publicRecords =
      scope === "campus"
        ? events.filter(
            (r) =>
              r.kind === "event" ||
              (!identity && !world.crumbs.some((c) => c.id === r.id)),
          )
        : [];
    const tonightHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hourCycle: "h23",
      }).format(now),
    );
    return [...crumbRecords, ...publicRecords, ...(scope === 'campus' ? demoRecords : [])]
      .filter(
        (r) =>
          isCurrentRecord(r, now) &&
          (category === "all" || r.category === category) &&
          (period !== "tonight" || r.kind !== "crumb" || tonightHour >= 18) &&
          (!query.trim() ||
            (r.title + " " + (r.venue ?? "") + " " + (r.description ?? ""))
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      )
      .sort((a, b) =>
        a.kind === b.kind
          ? a.kind === "crumb"
            ? Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "")
            : Date.parse(a.startsAt ?? "") - Date.parse(b.startsAt ?? "")
          : a.kind === "crumb"
            ? -1
            : 1,
      );
  }, [world.crumbs, crumbRecords, events, scope, category, period, query, identity, now, demoRecords]);
  function selectRecord(r: DiscoveryRecord, frame = true) {
    setSelected(r);
    if (frame && r.latitude !== null && r.longitude !== null) {
      const p = { latitude: r.latitude, longitude: r.longitude };
      if (
        p.latitude >= campus.bounds.south &&
        p.latitude <= campus.bounds.north &&
        p.longitude >= campus.bounds.west &&
        p.longitude <= campus.bounds.east
      )
        setCamera({
          ...toWorld(p),
          zoom: 20,
          y: toWorld(p).y + (320 / 20) * 0.18,
        });
    }
  }
  return {
    camera,
    setCamera,
    scope,
    setScope,
    period,
    setPeriod,
    category,
    setCategory,
    query,
    setQuery,
    selected,
    setSelected,
    selectRecord,
    draft,
    setDraft,
    resumePost,
    setResumePost,
    records,
    demo: demo && demoRemaining(demo) ? demo : null,
    demoKey: demoKey(demo),
    demoRecords,
    demoSeconds,
    startDemo,
    endDemo,
    heatmap,
    setHeatmap,
    loading: loading && !demo,
    error,
    refreshing,
    refresh,
    turns,
    setTurns,
    context,
    setContext,
    chatInput,
    setChatInput,
    chatScroll,
    setChatScroll,
    saved: loadedKey === storageKey ? saved : [],
    toggleSaved,
    savedReady: loadedKey === storageKey && savedReady,
    savedWritable: loadedKey === storageKey && canPersist,
    savedError: loadedKey === storageKey ? savedError : "",
    retrySaved: () => setSavedRetry((n) => n + 1),
  };
}
const Context = createContext<ReturnType<typeof useExploreValue> | null>(null);
export function ExploreProvider({ children }: PropsWithChildren) {
  const value = useExploreValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useExplore() {
  const value = useContext(Context);
  if (!value) throw new Error("ExploreProvider is missing");
  return value;
}
