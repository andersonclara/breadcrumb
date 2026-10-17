import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette } from "@breadcrumb/shared";
import { AuthProvider } from "@/providers/auth-provider";
import {WorldProvider} from '@/providers/world-provider';
import {useFonts,PressStart2P_400Regular} from '@expo-google-fonts/press-start-2p';

export default function RootLayout() {
  const [loaded,error]=useFonts({PressStart2P_400Regular});
  if(!loaded&&!error)return null;
  return <SafeAreaProvider><AuthProvider><WorldProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: palette.cream }, headerTintColor: palette.crust, headerTitleStyle:{fontFamily:'PressStart2P_400Regular',fontSize:9}, contentStyle: { backgroundColor: palette.cream } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Your Breadcrumb account", presentation: "modal" }} />
      <Stack.Screen name="profile" options={{title:"YOUR PROFILE"}}/>
      <Stack.Screen name="avatar" options={{title:'PLAYER CREATOR'}}/>
      <Stack.Screen name="friends" options={{title:'YOUR CAMPUS CREW'}}/>
    </Stack>
  </WorldProvider></AuthProvider></SafeAreaProvider>;
}
