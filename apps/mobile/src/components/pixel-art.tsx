import { useEffect, useState } from "react";
import Svg, { G, Path, Rect } from "react-native-svg";
import {
  avatarPixels,
  breadPixels,
  categories,
  categoryIconPixels,
  iconForRecord,
  toastPixels,
  defaultAvatar,
  type AvatarConfig,
  type DiscoveryRecord,
  type PixelIconName,
  type WorldCrumb,
} from "@breadcrumb/shared";
import { spritePaths } from "@/lib/map-sprites";
import { useReducedMotion } from "@/lib/use-reduced-motion";
export function AvatarGlyph({
  avatar = defaultAvatar,
  walking = false,
}: {
  avatar?: AvatarConfig;
  walking?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!walking) return;
    const t = setInterval(() => setFrame((f) => 1 - f), 225);
    return () => clearInterval(t);
  }, [walking]);
  return (
    <G>
      {avatarPixels(avatar, walking ? frame : 0).map((p, i) => (
        <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />
      ))}
    </G>
  );
}
export function PixelAvatar({
  avatar = defaultAvatar,
  size = 64,
  walking = false,
}: {
  avatar?: AvatarConfig;
  size?: number;
  walking?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size * 1.5}
      viewBox="0 0 16 24"
      accessibilityLabel="Pixel avatar"
    >
      <AvatarGlyph avatar={avatar} walking={walking} />
    </Svg>
  );
}
export function BreadGlyph({
  state = "crumb",
}: {
  state?: WorldCrumb["state"];
}) {
  return (
    <G>
      {breadPixels(state).map((p, i) => (
        <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />
      ))}
    </G>
  );
}
export function PixelBread({
  state = "crumb",
  size = 32,
}: {
  state?: WorldCrumb["state"];
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <BreadGlyph state={state} />
    </Svg>
  );
}

export function CategoryGlyph({ name }: { name: PixelIconName }) {
  return (
    <G>
      {spritePaths(categoryIconPixels(name)).map((p) => (
        <Path key={p.color} d={p.path} fill={p.color} />
      ))}
    </G>
  );
}
const iconLabel = (name: PixelIconName) =>
  name === "calendar" ? "Scheduled event" : name === "warning" ? "Warning"
    : categories.find((c) => c.id === name)?.label ?? "Campus report";
export function PixelIcon({ name, size = 24 }: { name: PixelIconName; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityLabel={iconLabel(name)}>
      <CategoryGlyph name={name} />
    </Svg>
  );
}
// Category art with a bread badge in the corner showing how confirmed a crumb is.
export function DiscoveryGlyph({
  record,
  state,
}: {
  record: Pick<DiscoveryRecord, "kind" | "category">;
  state?: WorldCrumb["state"] | null;
}) {
  return (
    <G>
      <CategoryGlyph name={iconForRecord(record)} />
      {record.kind === "crumb" && (
        <G>
          <Rect x={9.3} y={9.3} width={6.4} height={6.4} fill="#FFF1DA" stroke="#493E48" strokeWidth={0.6} />
          <G transform="translate(9.5 9.5) scale(0.375)">
            <BreadGlyph state={state ?? "crumb"} />
          </G>
        </G>
      )}
    </G>
  );
}
export function PixelDiscovery({
  record,
  state,
  size = 30,
}: {
  record: Pick<DiscoveryRecord, "kind" | "category">;
  state?: WorldCrumb["state"] | null;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <DiscoveryGlyph record={record} state={state} />
    </Svg>
  );
}

export function ToastGlyph({ once = false }: { once?: boolean }) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(once ? 5 : 0);
  useEffect(() => {
    if (!once || reduced) return;
    let n = 5;
    const timer = setInterval(() => {
      n++;
      setFrame(n);
      if (n >= 10) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [once, reduced]);
  return (
    <G>
      {frame < 10 &&
        toastPixels(frame).map((r, i) => (
          <Rect
            key={i}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={r.color}
          />
        ))}
    </G>
  );
}
export function ToastLogo({ size = 36, centered = false }: { size?: number; centered?: boolean }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={centered ? "-4 0 36 31" : "0 0 36 36"}
      accessibilityLabel="Breadcrumb toast logo"
    >
      <ToastGlyph />
    </Svg>
  );
}
