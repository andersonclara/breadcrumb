import { Pressable, Text, View } from "react-native";
import { discoveryTime, type DiscoveryRecord } from "@breadcrumb/shared";
import { PixelBread } from "./pixel-art";
import { Icon } from "./icon";
import { gameStyles as s } from "./game-ui";
import { theme as t } from "@/lib/theme";
export function DiscoveryRow({
  record: r,
  onPress,
}: {
  record: DiscoveryRecord;
  onPress: () => void;
}) {
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
        { flexDirection: "row", gap: 12, opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: r.kind === "crumb" ? "#FFF0CB" : t.sage,
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
          style={{
            fontSize: 17,
            lineHeight: 23,
            fontWeight: "600",
            color: t.ink,
          }}
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
          {r.kind === "crumb"
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
