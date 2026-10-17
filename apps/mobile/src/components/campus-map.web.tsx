import { StyleSheet, Text, View } from "react-native";
import { palette } from "@breadcrumb/shared";

// The native map package has no web renderer. Next.js owns the full web map.
export function CampusMap() {
  return <View style={styles.container}><Text style={styles.text}>Open Breadcrumb on iPhone or Android to view the native campus map.</Text></View>;
}
const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: palette.sage, justifyContent: "center", padding: 32 },
  text: { color: palette.crust, textAlign: "center", lineHeight: 24 },
});
