import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  campus,
  categories,
  fromWorld,
  toWorld,
  inCampus,
  crumbRecord,
  discoveryKey,
  postHeadline,
  describePostLocation,
  type MapBuilding,
  type Coordinate,
  type DiscoveryRecord,
  type DiscoveryPeriod,
} from "@breadcrumb/shared";
import { CampusMap } from "@/components/campus-map";
import { CrumbComposer } from "@/components/crumb-composer";
import { DiscoveryDetail } from "@/components/discovery-detail";
import { DiscoveryRow } from "@/components/discovery-row";
import { Sheet } from "@/components/sheet";
import { Icon } from "@/components/icon";
import { ToastLogo, PixelAvatar } from "@/components/pixel-art";
import {
  GameButton,
  Chip,
  Feedback,
  EmptyState,
  gameStyles as s,
} from "@/components/game-ui";
import { useCampus } from "@/providers/world-provider";
import { useExplore } from "@/providers/explore-provider";
import { useAuth } from "@/providers/auth-provider";
import { theme as t } from "@/lib/theme";
type Panel =
  | "nearby"
  | "detail"
  | "filters"
  | "search"
  | "building"
  | "post"
  | "discard"
  | null;
const periods: { id: DiscoveryPeriod; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "today", label: "Today" },
  { id: "tonight", label: "Tonight" },
  { id: "next7days", label: "This week" },
];
export default function MapScreen() {
  const insets = useSafeAreaInsets(),
    camp = useCampus(),
    explore = useExplore(),
    { session } = useAuth();
  const { world } = camp,
    { records, selected, draft, setDraft, camera, setCamera } = explore;
  const [panel, setPanel] = useState<Panel>(null),
    [placing, setPlacing] = useState(false),
    [point, setPoint] = useState<Coordinate | null>(null),
    [building, setBuilding] = useState<MapBuilding | null>(null),
    [group, setGroup] = useState<DiscoveryRecord[] | null>(null),
    [message, setMessage] = useState(""),
    [locating, setLocating] = useState(false),
    [ownPosition, setOwnPosition] = useState<Coordinate | null>(null),
    [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false),
    [dockHeight, setDockHeight] = useState(220);
  const scopeName =
    world.communities?.find((c) => c.id === explore.scope)?.name ?? "Campus";
  const nearby = group ?? records;
  const mapWorld = useMemo(() => ({ ...world, crumbs: [] }), [world]);
  const choose = useCallback(
    (r: DiscoveryRecord) => {
      Keyboard.dismiss();
      explore.selectRecord(r);
      setPanel("detail");
    },
    [explore],
  );
  const returnState = useRef({
    resumePost: explore.resumePost,
    selected: explore.selected,
    setResumePost: explore.setResumePost,
  });
  useLayoutEffect(() => {
    returnState.current = {
      resumePost: explore.resumePost,
      selected: explore.selected,
      setResumePost: explore.setResumePost,
    };
  }, [explore.resumePost, explore.selected, explore.setResumePost]);
  useFocusEffect(
    useCallback(() => {
      const state = returnState.current;
      if (state.resumePost) {
        setPanel("post");
        state.setResumePost(false);
      } else if (state.selected) setPanel("detail");
    }, []),
  );
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);
  function startPost(p?: Coordinate) {
    setMessage("");
    setPanel(null);
    explore.setSelected(null);
    setPoint(p ?? draft.point ?? fromWorld(camera.x, camera.y));
    setPlacing(true);
  }
  function useSpot() {
    if (!point) return;
    setDraft((d) => ({
      ...d,
      point,
      community: explore.scope,
      owner: session?.user.id ?? null,
    }));
    setPlacing(false);
    setPanel("post");
  }
  function close() {
    Keyboard.dismiss();
    setMessage("");
    if (panel === "post" && draft.text.trim()) {
      setPanel("discard");
      return;
    }
    if (panel === "detail") explore.setSelected(null);
    setPanel(null);
    setGroup(null);
  }
  async function locate() {
    if (locating) return;
    setLocating(true);
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage("Location is off. Search for a campus building instead.");
        return;
      }
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const location = {
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
      };
      if (!inCampus(location)) {
        setMessage("You are outside the UF map. You can still browse campus.");
        return;
      }
      setOwnPosition(location);
      setCamera({ ...toWorld(location), zoom: 18 });
    } catch {
      setMessage(
        "Could not find your location. Choose a building using search.",
      );
    } finally {
      setLocating(false);
    }
  }
  function signIn() {
    explore.setResumePost(true);
    setPanel(null);
    router.push("/login");
  }
  async function post() {
    if (submitting) return;
    if (!session) {
      signIn();
      return;
    }
    if (!world.profile) {
      setMessage("Your profile is still loading. Please retry.");
      void camp.refresh();
      return;
    }
    if (!world.profile.avatar_completed) {
      explore.setResumePost(true);
      setPanel(null);
      router.push("/profile?edit=1");
      return;
    }
    if (!draft.point || draft.text.trim().length < 3) return;
    setSubmitting(true);
    setMessage("");
    try {
      const result = await camp.act("create", {
        ...draft.point,
        title: postHeadline(draft.text),
        description: draft.text,
        category: draft.category,
        community_id: draft.community,
      });
      setDraft((d) => ({ ...d, text: "", point: null }));
      setPanel(null);
      setSuccess(
        result.grouped
          ? "Your update joined an existing Crumb."
          : "Your Crumb is on the map.",
      );
      // Wait for the real server record; do not invent expiry/confidence metadata.
      if (result.id) {
        const fresh = await camp.refresh();
        const created = fresh?.crumbs.find((c) => c.id === result.id);
        if (created) {
          explore.selectRecord(crumbRecord(created));
          setPanel("detail");
        }
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not post. Your draft is kept.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  const places = useMemo(() => {
    const q = explore.query.trim().toLowerCase();
    return q.length < 2
      ? []
      : campus.buildings
          .filter(
            (b) =>
              b.name &&
              b.name.toLowerCase().includes(q) &&
              !/generator|equipment|supply|building \d/i.test(b.name),
          )
          .slice(0, 12);
  }, [explore.query]);
  function chooseBuilding(b: MapBuilding) {
    setBuilding(b);
    setCamera({ ...camera, ...{ x: b.x, y: b.y + 2 }, zoom: 20 });
    setPanel("building");
  }
  const buildingRecords = building
    ? records.filter(
        (r) =>
          r.latitude !== null &&
          r.longitude !== null &&
          Math.hypot(
            toWorld({ latitude: r.latitude, longitude: r.longitude }).x -
              building.x,
            toWorld({ latitude: r.latitude, longitude: r.longitude }).y -
              building.y,
          ) *
            campus.metersPerUnit <
            90,
      )
    : [];
  const bottom = dockHeight;
  return (
    <View style={s.page}>
      <CampusMap
        camera={camera}
        onCamera={setCamera}
        world={mapWorld}
        records={records}
        placing={placing}
        onDrop={setPoint}
        onRecord={choose}
        onGroup={(items) => {
          setGroup(items);
          setPanel("nearby");
        }}
        onBuilding={chooseBuilding}
        onBlank={() => explore.setSelected(null)}
        selected={placing ? point : undefined}
        ownPosition={ownPosition ?? camp.position}
        bottomInset={bottom}
      />
      <View
        style={[styles.top, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search places and discoveries"
            onPress={() => {
              setMessage("");
              setPanel("search");
            }}
            style={({ pressed }) => [
              styles.search,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Icon name="search" />
            <Text style={{ fontSize: 16, color: t.muted, flex: 1 }}>
              Find your next campus moment
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile and account"
            onPress={() => router.push("/profile")}
            style={styles.avatar}
          >
            {world.profile ? (
              <PixelAvatar avatar={world.profile.avatar} size={26} />
            ) : (
              <Icon name="user" />
            )}
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters and community scope"
            onPress={() => setPanel("filters")}
            style={styles.scope}
          >
            <Icon name="filter" size={18} />
            <Text style={[s.label, { flexShrink: 1 }]}>
              {scopeName} ·{" "}
              {periods.find((p) => p.id === explore.period)?.label}
              {explore.category !== "all"
                ? " · " +
                  (categories.find((c) => c.id === explore.category)?.label ??
                    "Filtered")
                : ""}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask Breadcrumb"
            onPress={() => router.push("/ask")}
            style={styles.ask}
          >
            <Icon name="ask" size={18} />
            <Text style={s.label}>Ask</Text>
          </Pressable>
        </View>
      </View>
      {placing ? (
        <View
          onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)}
          style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <Text style={s.label}>Choose a spot for your Crumb</Text>
          <Text style={s.muted}>
            {point
              ? describePostLocation(point)
              : "Tap the map or choose a building"}
          </Text>
          <View style={s.row}>
            <GameButton
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                setPlacing(false);
                if (draft.text) setPanel("post");
              }}
            >
              Cancel
            </GameButton>
            <GameButton style={{ flex: 1 }} disabled={!point} onPress={useSpot}>
              Use this spot
            </GameButton>
          </View>
          <GameButton variant="secondary" onPress={() => setPanel("search")}>
            Choose a building
          </GameButton>
        </View>
      ) : (
        <View
          onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)}
          style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={s.row}>
              <ToastLogo size={28} />
              <Text style={{ fontSize: 21, fontWeight: "700", color: t.ink }}>
                Campus picks
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setGroup(null);
                setPanel("nearby");
              }}
              style={styles.textAction}
            >
              <Text style={s.label}>See list</Text>
              <Icon name="list" size={20} />
            </Pressable>
          </View>
          {explore.loading ? (
            <View style={s.row}>
              <ActivityIndicator color={t.ink} />
              <Text style={s.muted}>Finding campus discoveries?</Text>
            </View>
          ) : records[0] ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => choose(records[0])}
              style={{ minHeight: 48, justifyContent: "center", gap: 4 }}
            >
              <Text numberOfLines={1} style={s.label}>
                {records[0].title}
              </Text>
              <Text numberOfLines={1} style={s.muted}>
                {records[0].venue ?? "Campus discovery"}
              </Text>
            </Pressable>
          ) : (
            <Text style={s.muted}>
              {explore.error
                ? "Discoveries could not load. Open the list to retry."
                : "No matches right now. Try another time or filter."}
            </Text>
          )}
          <View style={s.row}>
            <GameButton style={{ flex: 1 }} onPress={() => startPost()}>
              Post a Crumb
            </GameButton>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Center map on my location without sharing"
              disabled={locating}
              onPress={() => void locate()}
              style={styles.avatar}
            >
              {locating ? (
                <ActivityIndicator color={t.ink} />
              ) : (
                <Icon name="location" />
              )}
            </Pressable>
          </View>
        </View>
      )}
      {(message && !panel) || success ? (
        <View style={[styles.toast, { bottom: bottom + 70 }]}>
          <Feedback error={!!message} message={message || success} />
        </View>
      ) : null}
      <Sheet
        visible={panel !== null}
        title={
          panel === "post"
            ? "Post a Crumb"
            : panel === "filters"
              ? "Make it your campus"
              : panel === "search"
                ? "Search campus"
                : panel === "detail"
                  ? "Discovery"
                  : panel === "building"
                    ? (building?.name ?? "Campus place")
                    : panel === "discard"
                      ? "Keep your draft?"
                      : "Campus picks"
        }
        onClose={close}
        footer={
          panel === "post" ? (
            <>
              <Feedback error message={message} />
              <GameButton
                loading={submitting}
                disabled={
                  !!session && (!draft.point || draft.text.trim().length < 3)
                }
                onPress={() => void post()}
              >
                {session ? "Post Crumb" : "Sign in to post"}
              </GameButton>
            </>
          ) : undefined
        }
      >
        {panel === "nearby" && (
          <>
            <Feedback error message={explore.error || camp.error} />
            {!!(explore.error || camp.error) && (
              <GameButton
                variant="secondary"
                onPress={() => {
                  void explore.refresh();
                  void camp.refresh();
                }}
              >
                Retry discoveries
              </GameButton>
            )}
            {explore.refreshing && <ActivityIndicator color={t.ink} />}
            <Text style={s.muted}>
              {group
                ? "At this spot"
                : scopeName +
                  " · " +
                  periods.find((p) => p.id === explore.period)?.label}
            </Text>
            {nearby.length ? (
              nearby.map((r) => (
                <DiscoveryRow
                  key={discoveryKey(r)}
                  record={r}
                  onPress={() => choose(r)}
                />
              ))
            ) : (
              <EmptyState
                title="Nothing found yet"
                description="Try another time or category, or share something happening on campus."
                action="Change filters"
                onAction={() => setPanel("filters")}
              />
            )}
          </>
        )}
        {panel === "filters" && (
          <>
            <Text style={s.label}>When</Text>
            <View style={styles.wrap}>
              {periods.map((p) => (
                <Chip
                  key={p.id}
                  label={p.label}
                  selected={explore.period === p.id}
                  onPress={() => explore.setPeriod(p.id)}
                />
              ))}
            </View>
            <Text style={s.label}>Category</Text>
            <View style={styles.wrap}>
              {[{ id: "all", label: "All categories" }, ...categories].map(
                (c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    selected={explore.category === c.id}
                    onPress={() => explore.setCategory(c.id)}
                  />
                ),
              )}
            </View>
            <Text style={s.label}>Community</Text>
            <View style={styles.wrap}>
              {(
                world.communities ?? [
                  { id: "campus", name: "Campus", joined: true },
                ]
              )
                .filter((c) => c.id === "campus" || c.joined)
                .map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={explore.scope === c.id}
                    onPress={() => explore.setScope(c.id)}
                  />
                ))}
            </View>
            <GameButton
              variant="secondary"
              onPress={() => {
                setPanel(null);
                router.push("/communities");
              }}
            >
              Find and manage communities
            </GameButton>
            <GameButton
              variant="secondary"
              onPress={() => {
                explore.setPeriod("next7days");
                explore.setCategory("all");
                explore.setScope("campus");
                explore.setQuery("");
              }}
            >
              Reset filters
            </GameButton>
            <GameButton onPress={() => setPanel(null)}>
              Show discoveries
            </GameButton>
          </>
        )}
        {panel === "search" && (
          <>
            <Text style={s.label}>Place or discovery</Text>
            <TextInput
              autoFocus
              accessibilityLabel="Search campus"
              placeholder="Try Reitz, pizza, or a club?"
              placeholderTextColor={t.muted}
              style={s.input}
              value={explore.query}
              onChangeText={explore.setQuery}
            />
            {explore.query.length > 0 && (
              <GameButton
                variant="secondary"
                onPress={() => explore.setQuery("")}
              >
                Clear search
              </GameButton>
            )}
            <Text style={s.label}>Campus places</Text>
            {places.map((b) => (
              <GameButton
                key={b.id}
                variant="secondary"
                onPress={() => {
                  Keyboard.dismiss();
                  if (placing) {
                    setPoint(fromWorld(b.x, b.y - b.height / 2));
                    setPanel(null);
                  } else chooseBuilding(b);
                }}
              >
                {b.name}
              </GameButton>
            ))}
            <Text style={s.label}>Discoveries</Text>
            {records.slice(0, 12).map((r) => (
              <DiscoveryRow
                key={discoveryKey(r)}
                record={r}
                onPress={() => choose(r)}
              />
            ))}
            {explore.query.length > 1 && !places.length && !records.length && (
              <Text style={s.muted}>
                No matches. Try a shorter name or ask Breadcrumb.
              </Text>
            )}
            <GameButton
              onPress={() => {
                setPanel(null);
                Keyboard.dismiss();
                router.push("/ask");
              }}
            >
              Ask Breadcrumb
            </GameButton>
          </>
        )}
        {panel === "building" && building && (
          <>
            <Text style={s.muted}>Happening at or near this place</Text>
            {buildingRecords.map((r) => (
              <DiscoveryRow
                key={discoveryKey(r)}
                record={r}
                onPress={() => choose(r)}
              />
            ))}
            {!buildingRecords.length && (
              <Text style={s.body}>
                No active discoveries here. Explore nearby or share a find.
              </Text>
            )}
            <GameButton
              onPress={() =>
                startPost(
                  fromWorld(building.x, building.y - building.height / 2),
                )
              }
            >
              Post here
            </GameButton>
            <GameButton
              variant="secondary"
              onPress={() => {
                setGroup(null);
                setPanel("nearby");
              }}
            >
              See campus picks
            </GameButton>
          </>
        )}
        {panel === "post" && (
          <CrumbComposer
            onChangeLocation={() => startPost()}
            onConfirm={(id) => {
              const c = world.crumbs.find((c) => c.id === id);
              if (c) choose(crumbRecord(c));
            }}
          />
        )}
        {panel === "detail" && selected && (
          <DiscoveryDetail
            key={discoveryKey(selected)}
            record={selected}
            onClose={() => {
              explore.setSelected(null);
              setPanel(null);
            }}
          />
        )}
        {panel === "discard" && (
          <>
            <Text style={s.body}>
              Your words and location can stay here until you&apos;re ready.
            </Text>
            <GameButton onPress={() => setPanel(null)}>
              Keep draft for later
            </GameButton>
            <GameButton variant="secondary" onPress={() => setPanel("post")}>
              Continue writing
            </GameButton>
            <GameButton
              variant="danger"
              onPress={() => {
                setDraft((d) => ({ ...d, text: "", point: null }));
                setPanel(null);
              }}
            >
              Discard draft
            </GameButton>
          </>
        )}
      </Sheet>
    </View>
  );
}
const styles = StyleSheet.create({
  top: { position: "absolute", left: 16, right: 16, gap: 10 },
  topRow: { flexDirection: "row", gap: 8 },
  search: {
    flex: 1,
    minHeight: 52,
    backgroundColor: t.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: t.border,
  },
  avatar: {
    width: 52,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: t.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: t.border,
  },
  scope: {
    flexShrink: 1,
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    backgroundColor: t.surface,
    borderRadius: 24,
  },
  ask: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: t.toast,
    borderRadius: 24,
  },
  dock: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    gap: 10,
    backgroundColor: t.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: t.border,
    maxWidth: 640,
    alignSelf: "center",
  },
  textAction: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toast: { position: "absolute", left: 16, right: 76 },
});
