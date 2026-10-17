import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette } from "@breadcrumb/shared";
import { AuthProvider } from "@/providers/auth-provider";

export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: palette.cream }, headerTintColor: palette.crust, contentStyle: { backgroundColor: palette.cream } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Your Breadcrumb account", presentation: "modal" }} />
    </Stack>
  </AuthProvider></SafeAreaProvider>;
}
