import { Text, View } from "react-native";
import {
  buildingLoaves,
  campus,
  type MapBuilding,
  type WorldCrumb,
} from "@breadcrumb/shared";
import { GameButton, gameStyles as s } from "./game-ui";
import { PixelBread } from "./pixel-art";

export function BuildingEvents({
  building,
  crumbs,
  onCrumb,
  onPost,
}: {
  building: MapBuilding;
  crumbs: WorldCrumb[];
  onCrumb: (c: WorldCrumb) => void;
  onPost: () => void;
}) {
  const loaves = buildingLoaves(building, crumbs, campus.metersPerUnit);
  return (
    <>
      <Text style={s.title}>{building.name || "Campus building"}</Text>
      {building.buildingNumber && (
        <Text style={s.label}>UF BUILDING {building.buildingNumber}</Text>
      )}
      <Text style={s.body}>Full Loaf events at or near this building.</Text>
      {loaves.length ? (
        loaves.map((c) => (
          <View key={c.id} style={{ gap: 8 }}>
            <PixelBread state="full_loaf" />
            <GameButton onPress={() => onCrumb(c)}>{c.title}</GameButton>
            <Text style={s.body}>Full Loaf</Text>
          </View>
        ))
      ) : (
        <Text style={s.body}>No active Full Loaf events here yet.</Text>
      )}
      <GameButton onPress={onPost}>LEAVE A CRUMB HERE</GameButton>
    </>
  );
}
