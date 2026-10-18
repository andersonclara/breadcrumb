import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  campus,
  categories,
  fromWorld,
  toWorld,
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
import { PixelFrame } from "@/components/pixel-frame";
import { Icon } from "@/components/icon";
import { ToastLogo, PixelAvatar } from "@/components/pixel-art";
import {
  GameButton,
  Chip,
  Feedback,
  EmptyState,
  useGameStyles,
} from "@/components/game-ui";
import { useCampus } from "@/providers/world-provider";
import { useExplore } from "@/providers/explore-provider";
import { useAuth } from "@/providers/auth-provider";
import type { Theme } from "@/lib/theme";
import { PixelThemeContext, ThemeContext, useTheme } from "@/lib/theme-context";
import { isDarkTheme, mapUITheme } from "@/lib/map-ui-theme";
import { useLiveMapLocation } from "@/lib/use-live-map-location";
import { mapAppearances } from "@/lib/map-appearance";
import { mapAppearanceMatrix } from "@/lib/map-appearance-rendering";
import { useMapAppearance } from "@/lib/use-map-appearance";
import { mapLightProbes, type MapLightProbe } from "@/lib/map-lighting";
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
  const nativeAppearance = Platform.OS !== 'web';
  const appearance = useMapAppearance(nativeAppearance);
  const { day, dusk, night } = appearance.light;
  const uiTheme = useMemo(() => mapUITheme({
    mode: appearance.mode, light: { day, dusk, night },
    ready: appearance.ready, enabled: nativeAppearance,
  }), [appearance.mode, appearance.ready, nativeAppearance, day, dusk, night]);
  return (
    <ThemeContext value={uiTheme}>
      <PixelThemeContext value>
        <MapScreenContent appearance={appearance} />
      </PixelThemeContext>
    </ThemeContext>
  );
}

function MapScreenContent({ appearance }: { appearance: ReturnType<typeof useMapAppearance> }) {
  const viewport = useWindowDimensions();
  const compact = viewport.width > viewport.height && viewport.height < 500;
  const t = useTheme(), s = useGameStyles();
  const styles = useMemo(() => createStyles(t), [t]);
  const dark = isDarkTheme(t);
  useFocusEffect(useCallback(() => {
    StatusBar.setStyle(dark ? 'light' : 'dark');
    return () => StatusBar.setStyle('dark');
  }, [dark]));
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
    [group, setGroup] = useState<string[] | null>(null),
    [message, setMessage] = useState(""),
    [following, setFollowing] = useState(true),
    [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false),
    [dockHeight, setDockHeight] = useState(220);
  const [followRequest, setFollowRequest] = useState(0);
  const [lightProbe, setLightProbe] = useState<MapLightProbe | null>();
  const nativeAppearance = Platform.OS !== 'web';
  const { day, dusk, night } = appearance.light;
  const lightingLevel = appearance.ready && appearance.mode !== 'original' ? night + dusk * .4 : 0;
  const tileMatrix = useMemo(() => mapAppearanceMatrix({
    mode: appearance.mode, light: { day, dusk, night }, ready: appearance.ready, enabled: nativeAppearance,
  }), [appearance.mode, appearance.ready, nativeAppearance, day, dusk, night]);
  const location = useLiveMapLocation(session?.user.id);
  const browseMap = useCallback(() => setFollowing(false), []);
  const scopeName =
    world.communities?.find((c) => c.id === explore.scope)?.name ?? "Campus";
  const nearby = group ? records.filter(r => group.includes(discoveryKey(r))) : records;
  const mapWorld = useMemo(() => ({ ...world, crumbs: [] }), [world]);
  const choose = useCallback(
    (r: DiscoveryRecord) => {
      setFollowing(false);
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
        setFollowing(false);
        setPanel("post");
        state.setResumePost(false);
      } else if (state.selected) {
        setFollowing(false);
        setPanel("detail");
      }
    }, []),
  );
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);
  function startPost(p?: Coordinate) {
    setFollowing(false);
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
  function locate() {
    setMessage("");
    setFollowing(true);
    setFollowRequest(request => request + 1);
    if (!location.position) location.locate();
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
    setFollowing(false);
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
        colorMatrix={tileMatrix}
        lightProbe={__DEV__ && nativeAppearance ? lightProbe : undefined}
        lightingLevel={lightingLevel}
        camera={camera}
        onCamera={setCamera}
        onInteract={browseMap}
        followPosition={following && !placing ? location.position : null}
        followRequest={followRequest}
        world={mapWorld}
        records={records}
        heatmap={explore.heatmap}
        placing={placing}
        onDrop={setPoint}
        onRecord={choose}
        onGroup={(items) => {
          setGroup(items.map(discoveryKey));
          setPanel("nearby");
        }}
        onBuilding={chooseBuilding}
        onBlank={() => explore.setSelected(null)}
        selected={placing ? point : undefined}
        ownPosition={location.position}
        walking={location.walking}
        bottomInset={bottom}
      />
      <View
        style={[styles.top, { top: insets.top + 8 }, compact && { right: undefined, width: viewport.width * .43 }]}
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
            <PixelFrame />
            <Icon name="search" />
            <Text numberOfLines={1} style={[styles.pixelLabel, { fontSize: 12, color: t.muted, flex: 1 }]}>
              Search campus
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile and account"
            onPress={() => router.push("/profile")}
            style={styles.avatar}
          >
            <PixelFrame />
            {world.profile ? (
              <PixelAvatar avatar={world.profile.avatar} size={26} />
            ) : (
              <Icon name="user" />
            )}
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters and community scope"
            onPress={() => setPanel("filters")}
            style={styles.scope}
          >
            <PixelFrame fill={t.sage} />
            <Icon name="filter" size={18} />
            <Text numberOfLines={2} style={[styles.pixelLabel, { flexShrink: 1 }]}>
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
            <PixelFrame fill={t.toast} accent />
            <Icon name="ask" size={18} color={t.buttonInk} />
            <Text style={[styles.pixelLabel, { color: t.buttonInk }]}>Ask</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={explore.demo ? 'End demo' : 'Start five-minute campus demo'}
            onPress={() => {
              if (explore.demo) { explore.endDemo(); return; }
              setFollowing(false);
              explore.startDemo();
            }} style={styles.ask}>
            <PixelFrame fill={t.toast} accent />
            <Text style={[styles.pixelLabel, { color: t.buttonInk }]}>{explore.demo ? "End demo" : "Demo"}</Text>
          </Pressable>
        </View>
      </View>
      {placing ? (
        <View
          onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)}
          style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }, compact && { right: 16, alignSelf: 'auto', width: viewport.width * .43 }]}
        >
          <PixelFrame panel />
          <Text style={styles.pixelLabel}>Choose a spot for your Crumb</Text>
          <Text style={styles.pixelBody}>
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
          style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }, compact && { right: 16, alignSelf: 'auto', width: viewport.width * .43 }]}
        >
          <PixelFrame panel />
          <View style={styles.picksHeader}>
            <View style={[s.row, { flexShrink: 1 }]}>
              <ToastLogo size={28} />
              <Text style={styles.picksTitle}>
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
              <Text style={styles.pixelLabel}>See list</Text>
              <Icon name="list" size={20} />
            </Pressable>
          </View>
          {explore.loading ? (
            <View style={s.row}>
              <ActivityIndicator color={t.ink} />
              <Text style={styles.pixelBody}>Finding campus discoveries?</Text>
            </View>
          ) : records[0] ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => choose(records[0])}
              style={styles.pickPreview}
            >
              <Text numberOfLines={1} style={styles.pixelLabel}>
                {records[0].title}
              </Text>
              <Text numberOfLines={1} style={styles.pixelBody}>
                {records[0].venue ?? "Campus discovery"}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.pixelBody}>
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
              accessibilityLabel="Follow my location without sharing"
              accessibilityState={{ selected: following && !!location.position, busy: location.locating }}
              disabled={location.locating}
              onPress={locate}
              style={styles.avatar}
            >
              <PixelFrame fill={following && location.position ? t.sage : t.surface} />
              {location.locating ? (
                <ActivityIndicator color={t.ink} />
              ) : (
                <Icon name="location" />
              )}
            </Pressable>
          </View>
        </View>
      )}
      {((message || location.error) && !panel) || success ? (
        <View style={[styles.toast, { bottom: bottom + 70 }]}>
          <Feedback error={!!(message || location.error)} message={message || success || location.error} />
        </View>
      ) : null}
      <Sheet
        visible={panel !== null && (panel !== 'detail' || !!selected)}
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
            <Text style={s.label}>Map activity</Text>
            <View style={styles.wrap}>
              <Chip label="Pins" selected={!explore.heatmap} onPress={() => explore.setHeatmap(false)} />
              <Chip label="Heatmap + pins" selected={explore.heatmap} onPress={() => explore.setHeatmap(true)} />
            </View>
            {explore.heatmap && <Text style={s.muted}>Orange to red shows fewer to more active reports, not attendance. Your category filter also filters the heatmap.</Text>}
            {!explore.demo && <GameButton variant="secondary" onPress={() => {
              setFollowing(false); explore.startDemo(); setPanel(null);
            }}>Start five-minute demo</GameButton>}
            {explore.demo && <GameButton variant="secondary" onPress={explore.endDemo}>End demo</GameButton>}
            {nativeAppearance && <>
              <Text style={s.label}>Map appearance</Text>
              <View style={styles.wrap}>
                {mapAppearances.map(option => <Chip key={option.id} label={option.label}
                  selected={appearance.mode === option.id} onPress={() => appearance.choose(option.id)} />)}
              </View>
              <Text style={s.muted}>
                Automatic follows the sun at UF. Original uses the unfiltered map artwork.
                Exterior lights are illustrative scenery.
              </Text>
              {appearance.storageStatus === 'saved' && <Text style={s.muted}>Choice saved on this device.</Text>}
              {appearance.storageStatus === 'saving' && <Text style={s.muted}>Saving choice…</Text>}
              <Feedback error message={appearance.error} />
            </>}
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
            {__DEV__ && (
              <>
                {nativeAppearance && <>
                  <Text style={s.label}>Lighting checks (development)</Text>
                  <View style={styles.wrap}>
                    {mapLightProbes.map(option => <Chip key={option.id} label={option.label}
                      selected={(lightProbe === null ? 'off' : lightProbe?.mode ?? 'appearance') === option.id} onPress={() => {
                        if (option.id === 'off') { setLightProbe(null); return; }
                        if (option.id === 'appearance') { setLightProbe(undefined); return; }
                        setFollowing(false);
                        const fixed = option.id === 'fixtures';
                        setLightProbe(fixed ? { mode: option.id }
                          : { mode: option.id, point: { x: camera.x + 2, y: camera.y - 2 } });
                        setCamera(fixed
                          ? { x: 196, y: 54, zoom: 8 } : { ...camera, zoom: 12 });
                      }} />)}
                  </View>
                  <Text style={s.muted}>
                    Use Night for contrast. Dot and Glow zoom in and appear above/right of center.
                    Fixtures centers the view on the stadium exterior. These lights are illustrative scenery.
                    Follow map uses the selected appearance and fades out at distant zoom.
                    A full restart restores normal appearance lighting.
                  </Text>
                </>}
                <GameButton
                  variant="secondary"
                  onPress={() => {
                    setPanel(null);
                    router.push("/map-appearance-lab");
                  }}
                >
                  Appearance check (development)
                </GameButton>
              </>
            )}
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
              selectionColor={t.ink}
              keyboardAppearance={dark ? "dark" : "light"}
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
const createStyles = (t: Theme) => StyleSheet.create({
  pixelLabel: { fontFamily: "PressStart2P_400Regular", fontSize: 10, lineHeight: 18, color: t.ink },
  pixelBody: { fontFamily: "PressStart2P_400Regular", fontSize: 10, lineHeight: 19, color: t.muted },
  picksTitle: { fontFamily: "PressStart2P_400Regular", fontSize: 13, lineHeight: 21, color: t.ink, flexShrink: 1 },
  picksHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, borderBottomWidth: 2, borderBottomColor: t.border, paddingBottom: 8 },
  pickPreview: { minHeight: 60, justifyContent: "center", gap: 6, padding: 10, backgroundColor: t.sage, borderWidth: 2, borderColor: t.border },
  top: { position: "absolute", left: 16, right: 16, gap: 10 },
  topRow: { flexDirection: "row", gap: 8 },
  search: {
    flex: 1,
    minHeight: 52,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 0,
    borderColor: t.border,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  avatar: {
    width: 52,
    minHeight: 52,
    borderRadius: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderColor: t.border,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scope: {
    flexShrink: 1,
    minWidth: 120,
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    borderColor: t.border,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  ask: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    borderColor: t.buttonInk,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  dock: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    gap: 10,
    backgroundColor: "transparent",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 0,
    borderColor: t.border,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
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
