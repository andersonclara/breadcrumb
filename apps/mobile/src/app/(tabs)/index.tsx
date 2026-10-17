import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { categories, palette } from "@breadcrumb/shared";
import { CampusMap } from "@/components/campus-map";
import { useAuth } from "@/providers/auth-provider";

export default function MapScreen() {
  const { session } = useAuth();
  return <SafeAreaView edges={["top"]} style={styles.page}>
    <View style={styles.header}>
      <View><Text style={styles.logo}>breadcrumb</Text><Text style={styles.caption}>Leave a crumb. Spread the word.</Text></View>
      <Link href="/login" style={styles.signIn}>{session ? "Account" : "Sign in"}</Link>
    </View>
    <View style={styles.map}>
      <CampusMap />
      <View style={styles.banner} pointerEvents="none"><Text style={styles.bannerText}>Your campus, in the moment.</Text></View>
      <View style={styles.mapNote} pointerEvents="none"><Text style={styles.note}>UF campus · Community pins coming next</Text></View>
    </View>
    <ScrollView horizontal style={styles.categoryStrip} contentContainerStyle={styles.categories} showsHorizontalScrollIndicator={false} accessibilityLabel="Crumb categories">
      {categories.map(category => <View key={category.id} style={styles.category}><Text style={{ color: category.color }}>{category.icon}</Text><Text style={styles.categoryText}>{category.label}</Text></View>)}
    </ScrollView>
    <Text style={styles.footer}>Community reports · Not an official alert service</Text>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.cream },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, gap: 12 },
  logo: { color: palette.crust, fontSize: 25, fontWeight: "800", letterSpacing: -1 },
  caption: { color: palette.crust, fontSize: 11, marginTop: 4 },
  signIn: { color: palette.crust, fontWeight: "700", padding: 12, borderWidth: 1, borderColor: "#774D3540", borderRadius: 24 },
  map: { flex: 1, minHeight: 240, overflow: "hidden" },
  banner: { position: "absolute", top: 16, left: 16, right: 16, padding: 16, backgroundColor: palette.cream, borderRadius: 16 },
  bannerText: { color: palette.crust, fontWeight: "600", textAlign: "center" },
  mapNote: { position: "absolute", bottom: 24, alignSelf: "center", borderRadius: 16, padding: 12, backgroundColor: palette.cream },
  note: { color: palette.crust, fontSize: 11 },
  categoryStrip: { flexGrow: 0 },
  categories: { gap: 8, padding: 16 },
  category: { flexDirection: "row", gap: 8, alignItems: "center", borderWidth: 1, borderColor: "#774D3530", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10 },
  categoryText: { color: palette.crust, fontSize: 12 },
  footer: { color: palette.crust, fontSize: 10, textAlign: "center", paddingBottom: 12 },
});
