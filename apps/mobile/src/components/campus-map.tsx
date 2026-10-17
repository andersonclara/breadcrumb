import MapView from "react-native-maps";
import { StyleSheet } from "react-native";
import { UF_VIEW } from "@breadcrumb/shared";

export function CampusMap() {
  return <MapView style={StyleSheet.absoluteFill} initialRegion={{
    latitude: UF_VIEW.latitude, longitude: UF_VIEW.longitude,
    latitudeDelta: 0.025, longitudeDelta: 0.025,
  }} accessibilityLabel="Map of the University of Florida campus" />;
}
