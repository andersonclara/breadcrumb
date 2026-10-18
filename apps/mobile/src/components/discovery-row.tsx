import { Pressable, Text, View } from "react-native";
import { discoveryTime, isDemoRecord, type DiscoveryRecord } from "@breadcrumb/shared";
import { PixelBread } from "./pixel-art";
import { Icon } from "./icon";
import { useGameStyles } from "./game-ui";
import { useTheme } from "@/lib/theme-context";
import { PixelFrame } from "./pixel-frame";
export function DiscoveryRow({
  record: r,
  onPress,
}: {
  record: DiscoveryRecord;
  onPress: () => void;
}) {
  const t = useTheme(), s = useGameStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        r.title +
        ", " +
        (r.venue ?? "Venue not listed") +
        ", " +
        discoveryTime(r)
      }
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { flexDirection: "row", gap: 12, borderWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, backgroundColor: "transparent", opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <PixelFrame />
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 0,
          borderWidth: 2,
          borderColor: t.border,
          backgroundColor: r.kind === "crumb" ? t.crumbSurface : t.sage,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {r.kind === "crumb" ? (
          <PixelBread size={30} state={r.state ?? "crumb"} />
        ) : (
          <Icon name="list" />
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={s.label}
        >
          {r.title}
        </Text>
        <Text style={s.muted}>{r.venue ?? "Venue not listed"}</Text>
        <Text style={s.muted}>{discoveryTime(r)}</Text>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: r.kind === "crumb" ? t.success : t.muted,
          }}
        >
          {isDemoRecord(r) ? 'Demo · simulated report' : r.kind === "crumb"
            ? r.confirmCount
              ? "Confirmed by " +
                r.confirmCount +
                " student" +
                (r.confirmCount === 1 ? "" : "s")
              : "Unconfirmed report"
            : r.source}
          {r.priceText ? " · " + r.priceText : ""}
        </Text>
      </View>
      <Icon name="chevron" size={18} />
    </Pressable>
  );
}
