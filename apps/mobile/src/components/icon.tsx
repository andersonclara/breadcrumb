import Svg, { Path, Circle, Rect } from "react-native-svg";
import { theme } from "@/lib/theme";
export type IconName =
  | "search"
  | "filter"
  | "close"
  | "back"
  | "location"
  | "plus"
  | "minus"
  | "ask"
  | "list"
  | "user"
  | "bookmark"
  | "chevron"
  | "eye"
  | "eye-off"
  | "more";
export function Icon({
  name,
  size = 22,
  color = theme.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const paths: Partial<Record<IconName, string>> = {
    filter: "M4 6h16M7 12h10M10 18h4",
    close: "m6 6 12 12M6 18 18 6",
    back: "m14 5-7 7 7 7",
    location: "m12 3 8 17-8-4-8 4 8-17Z",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    ask: "M5 5h14v11H9l-4 4V5Z",
    list: "M8 6h12M8 12h12M8 18h12M4 6h.1M4 12h.1M4 18h.1",
    user: "M5 21v-2a7 7 0 0 1 14 0v2",
    bookmark: "M6 3h12v18l-6-4-6 4V3Z",
    chevron: "m9 5 7 7-7 7",
    more: "M5 12h.1M12 12h.1M19 12h.1",
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "search" ? (
        <>
          <Circle cx={10.5} cy={10.5} r={6.5} />
          <Path d="m16 16 5 5" />
        </>
      ) : name === "eye" || name === "eye-off" ? (
        <>
          <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <Circle cx={12} cy={12} r={3} />
          {name === "eye-off" && <Path d="m3 3 18 18" />}
        </>
      ) : name === "user" ? (
        <>
          <Circle cx={12} cy={7} r={4} />
          <Path d={paths.user} />
        </>
      ) : name === "ask" ? (
        <>
          <Path d={paths.ask} />
          <Rect x={8} y={8} width={8} height={1} />
          <Path d="M8 12h5" />
        </>
      ) : (
        <Path d={paths[name]} />
      )}
    </Svg>
  );
}
