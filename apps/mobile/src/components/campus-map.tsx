import { memo, useCallback, useMemo, useRef, useLayoutEffect, useState, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Stop, G, Path, Circle, Text as SvgText } from "react-native-svg";
import {
  campus, toWorld, fromWorld, inCampus,
  type MapCamera, type MapSize, type MapBuilding, type Coordinate, type World, type DiscoveryRecord,
  reportHeatCells,
} from "@breadcrumb/shared";
import { screenToWorld } from "@/lib/map-gesture";
import { hitTileBuilding, tileBuildingLabels, mapPeople } from "@/lib/map-catalog";
import { overlayPosition } from "@/lib/map-viewport";
import { mapTileLevel, tileBounds } from "@/lib/map-tiles";
import { useMapCamera } from "@/lib/use-map-camera";
import { CampusTiles } from "./campus-tiles";
import { BreadGlyph, PixelAvatar } from "./pixel-art";
import { Icon } from "./icon";
import { theme, type Theme } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { MapLightProbe } from "@/lib/map-lighting";

type Props = {
  camera: MapCamera;
  onCamera: (c: MapCamera) => void;
  onInteract?: () => void;
  followPosition?: Coordinate | null;
  followRequest?: number;
  world: World;
  records: DiscoveryRecord[];
  placing: boolean;
  onDrop: (p: Coordinate) => void;
  onRecord: (r: DiscoveryRecord) => void;
  onGroup: (records: DiscoveryRecord[]) => void;
  onBuilding: (b: MapBuilding) => void;
  onBlank: () => void;
  selected?: Coordinate | null;
  ownPosition?: Coordinate | null;
  walking?: boolean;
  bottomInset?: number;
  colorMatrix?: number[];
  lightProbe?: MapLightProbe | null;
  lightingLevel?: number;
  heatmap?: boolean;
};
type MarkerGroup = { x: number; y: number; records: DiscoveryRecord[] };

// Markers and labels retain a constant touch/read size while their anchors move
// on UI. They never invalidate the cached terrain when presence or votes refresh.
const MapAnchor = memo(function MapAnchor({ point, live, size, width = 48, height = 48,
  bottomInset = 0, label = false, grounded = false, children }: PropsWithChildren<{
    point: { x: number; y: number }; live: SharedValue<MapCamera>; size: MapSize;
    width?: number; height?: number; bottomInset?: number; label?: boolean; grounded?: boolean;
  }>) {
  const style = useAnimatedStyle(() => {
    const p = overlayPosition(point, live.value, size);
    const visible = p.x > -width && p.x < size.width + width && p.y > (label ? 150 : -height) &&
      p.y < size.height - bottomInset && (!label || live.value.zoom >= 8);
    return { opacity: visible ? 1 : 0,
      transform: [{ translateX: p.x - width / 2 }, { translateY: p.y - (grounded ? height - 6 : height / 2) }] };
  }, [live, point.x, point.y, size.width, size.height, width, height, bottomInset, label, grounded]);
  return <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
    style={[styles.anchor, { width, height }, style]}>{children}</Animated.View>;
});

export function CampusMap({ camera, onCamera, onInteract, followPosition, followRequest, world, records, placing, onDrop, onRecord,
  onGroup, onBuilding, onBlank, selected, ownPosition, walking = false, bottomInset = 190, colorMatrix, lightProbe, lightingLevel, heatmap = false }: Props) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const reduced = useReducedMotion();
  const [size, setSize] = useState<MapSize>({ width: 390, height: 700 });
  const displayedGroups = useRef<MarkerGroup[]>([]);
  const tap = useCallback((screen: { x: number; y: number }, at: MapCamera) => {
    const point = screenToWorld(at, screen, size), p = fromWorld(point.x, point.y);
    if (placing) { if (inCampus(p)) onDrop(p); return; }
    const group = displayedGroups.current.find((g) => {
      const p = overlayPosition(g, at, size);
      return Math.hypot(p.x - screen.x, p.y - screen.y) < 24;
    });
    if (group) { if (group.records.length > 1) onGroup(group.records); else onRecord(group.records[0]); return; }
    const building = hitTileBuilding(point, mapTileLevel(at, size) < 5);
    if (building) onBuilding(building);
    else onBlank();
  }, [size, placing, onDrop, onGroup, onRecord, onBuilding, onBlank]);
  const followTarget = useMemo(() => followPosition ? toWorld(followPosition) : null, [followPosition]);
  const { live, scene, gesture, zoomBy } = useMapCamera(camera, size, onCamera, tap, onInteract, followTarget, followRequest);
  const groups = useMemo(() => {
    const result: MarkerGroup[] = [];
    const scale = Math.max(size.width, size.height) * scene.zoom / 320;
    for (const r of records) {
      if (r.latitude === null || r.longitude === null || !inCampus({ latitude: r.latitude, longitude: r.longitude })) continue;
      const p = toWorld({ latitude: r.latitude, longitude: r.longitude });
      const screen = overlayPosition(p, scene, size);
      if (screen.x < -size.width * .3 || screen.x > size.width * 1.3 ||
        screen.y < -size.height * .3 || screen.y > size.height * 1.3) continue;
      const group = result.find((g) => Math.hypot(g.x - p.x, g.y - p.y) * scale < 42);
      if (group) group.records.push(r);
      else result.push({ ...p, records: [r] });
    }
    return result;
  }, [records, scene, size]);
  useLayoutEffect(() => { displayedGroups.current = groups; }, [groups]);
  const labels = useMemo(() => {
    const boxes: { x: number; y: number; width: number }[] = [];
    return tileBuildingLabels(scene, size).filter((b) => {
      if (!(b.landmark || /marston|turlington|reitz|century|library west|^hub$/i.test(b.name)) ||
        /woodland canopy|generator|equipment|supply|building \d/i.test(b.name)) return false;
      const screen = overlayPosition({ x: b.x, y: b.y - b.artHeight }, scene, size);
      const width = Math.min(180, b.name.length * 7);
      if (screen.x < width / 2 + 8 || screen.x > size.width - width / 2 - 8 || screen.y < 155 ||
        screen.y > size.height - bottomInset - 20 || boxes.some((p) =>
          Math.abs(p.x - screen.x) < (p.width + width) / 2 + 8 && Math.abs(p.y - screen.y) < 28)) return false;
      boxes.push({ ...screen, width }); return true;
    }).map((b) => ({ id: b.id, point: { x: b.x, y: b.y - b.artHeight },
      name: b.name.replace("J. Wayne ", "").replace("Ben Hill Griffin Stadium", "The Swamp") }));
  }, [scene, size, bottomInset]);
  const people = useMemo(() => {
    const bounds = tileBounds(scene, size);
    return mapPeople(world, ownPosition).filter(p => p.x >= bounds.left && p.x <= bounds.right &&
      p.y >= bounds.top && p.y <= bounds.bottom);
  }, [world, ownPosition, scene, size]);
  const heat = useMemo(() => heatmap ? reportHeatCells(records) : [], [heatmap, records]);
  return <View style={styles.map} onLayout={(e) => {
    const { width, height } = e.nativeEvent.layout;
    // Stack transitions can briefly report a hidden screen as 0×0. Keep the
    // last usable viewport so cached scenery and gesture math stay finite.
    if (width <= 0 || height <= 0) return;
    setSize((old) => old.width === width && old.height === height ? old : { width, height });
  }}>
    <GestureDetector gesture={gesture} touchAction="none">
      <View collapsable={false} accessible={false} style={StyleSheet.absoluteFill}>
        <CampusTiles scene={scene} size={size} live={live} colorMatrix={colorMatrix} lightProbe={lightProbe} lightingLevel={lightingLevel} />
        {heat.map(cell => <MapAnchor key={cell.key} point={cell} live={live} size={size} width={140} height={140}>
          <Svg width={140} height={140} viewBox="-70 -70 140 140">
            <Defs><RadialGradient id={`density-${cell.key.replace(':', '-')}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={cell.count >= 8 ? '#E32929' : '#F97316'} stopOpacity={Math.min(.8, .2 + cell.count / 30)} />
              <Stop offset=".5" stopColor={cell.count >= 8 ? '#EF4444' : '#FB923C'} stopOpacity={Math.min(.4, cell.count / 50)} />
              <Stop offset="1" stopColor="#EF4444" stopOpacity="0" />
            </RadialGradient></Defs>
            <Circle r={70} fill={`url(#density-${cell.key.replace(':', '-')})`} />
          </Svg>
        </MapAnchor>)}
        {labels.map((l) => <MapAnchor key={l.id} point={l.point} live={live} size={size} width={180} height={24} bottomInset={bottomInset + 20} label>
          <Text numberOfLines={1} style={styles.label}>{l.name}</Text>
        </MapAnchor>)}
        {people.map((p) => <MapAnchor key={p.id} point={p} live={live} size={size} width={70} height={68} grounded={p.id === 'self'}>
          {p.id === 'self' && <View style={styles.locationHalo}/>}
          <Text style={styles.personLabel}>{p.id === "self" ? "You" : "Friend ≈100m"}</Text><PixelAvatar avatar={p.avatar} size={29} walking={p.id === 'self' && walking && !reduced}/>
        </MapAnchor>)}
        {selected && <MapAnchor point={toWorld(selected)} live={live} size={size}>
          <View style={styles.target} />
        </MapAnchor>}
        {groups.map((g) => <MapAnchor key={g.records.map((r) => `${r.kind}:${r.id}`).join(":")} point={g} live={live} size={size}>
          <Svg width={48} height={48} viewBox="-24 -24 48 48">
            <Circle r={22} fill={t.surface} stroke={t.ink} strokeWidth={1.5} />
            {g.records.length > 1 ? <SvgText fontSize={16} fontWeight="bold" fill={t.ink} textAnchor="middle" y={6}>{g.records.length}</SvgText> :
              g.records[0].kind === "crumb" ? <G transform="translate(-16 -16) scale(2)"><BreadGlyph state={g.records[0].state ?? "crumb"} /></G> :
              <Path d="M-8 -10h16v18H-8zM-8 -4H8M-4 -13v6M4 -13v6" fill={t.sage} stroke={t.ink} strokeWidth={2} />}
          </Svg>
        </MapAnchor>)}
      </View>
    </GestureDetector>
    <View style={[styles.controls, { bottom: bottomInset + 16 }]}>
      {(["plus", "minus"] as const).map((name) => <Pressable key={name} accessibilityRole="button"
        accessibilityLabel={name === "plus" ? "Zoom in" : "Zoom out"}
        style={({ pressed }) => [styles.control, pressed && { opacity: .7 }]}
        onPress={() => zoomBy(name === "plus" ? 1.5 : 1 / 1.5)}><Icon name={name} /></Pressable>)}
    </View>
    <Text pointerEvents="none" style={[styles.credit, { bottom: bottomInset + 2 }]}>© UF GIS + OpenStreetMap · ODbL</Text>
  </View>;
}
const createStyles = (t: Theme) => StyleSheet.create({
  map: { flex: 1, backgroundColor: campus.colors[0], overflow: "hidden" },
  scenery: { position: "absolute", top: 0, left: 0, transformOrigin: [0, 0, 0] },
  anchor: { position: "absolute", top: 0, left: 0, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "700", color: t.ink, backgroundColor: t.surface + "E6", paddingHorizontal: 4, borderRadius: 4 },
  personLabel: { fontSize: 10, color: t.ink, backgroundColor: t.surface },
  locationHalo: { position: "absolute", bottom: 0, width: 28, height: 12, borderRadius: 14, borderWidth: 2, borderColor: t.ink, backgroundColor: t.sage },
  target: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: t.ink, backgroundColor: "#F4BC5588" },
  controls: { position: "absolute", right: 16, gap: 8 },
  control: { width: 48, height: 48, borderRadius: 14, backgroundColor: t.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.border },
  credit: { position: "absolute", left: 12, fontSize: 10, color: t.ink, backgroundColor: t.surface + "E6", padding: 3, borderRadius: 4 },
});
const styles = createStyles(theme);
