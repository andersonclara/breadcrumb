import { palette } from "@breadcrumb/shared";
import { StyleSheet, Text, View } from "react-native";

export function EmptyScreen({ title, description }: { title: string; description: string }) {
  return <View style={styles.container}>
    <Text style={styles.eyebrow}>BREADCRUMB · UF</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    <Text style={styles.note}>Coming soon</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.cream, padding: 28, justifyContent: "center", gap: 16 },
  eyebrow: { color: palette.crust, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  title: { color: palette.crust, fontSize: 36, fontWeight: "700" },
  description: { color: palette.crust, fontSize: 16, lineHeight: 26 },
  note: { color: palette.crust, opacity: 0.6, fontSize: 13, marginTop: 12 },
});
