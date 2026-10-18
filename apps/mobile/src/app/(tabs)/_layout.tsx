import { Stack } from "expo-router";
import { theme } from "@/lib/theme";
export default function ExploreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.ink,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false, title: "Explore" }}
      />
      <Stack.Screen name="ask" options={{ title: "Ask Breadcrumb" }} />
      <Stack.Screen name="buzz" options={{ title: "Nearby" }} />
      <Stack.Screen name="communities" options={{ title: "Communities" }} />
      <Stack.Screen name="radar" options={{ headerShown: false }} />
    </Stack>
  );
}
