import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { WorldProvider } from "@/providers/world-provider";
import { ExploreProvider } from "@/providers/explore-provider";
import {
  useFonts,
  PressStart2P_400Regular,
} from "@expo-google-fonts/press-start-2p";
import { theme } from "@/lib/theme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
function LoadingScreen() {
  return (
    <View style={{flex:1,justifyContent:"center",backgroundColor:theme.background}}>
      <ActivityIndicator color={theme.ink}/>
    </View>
  );
}

function CampusNavigation() {
  const {session,loading}=useAuth();
  if(loading)return <LoadingScreen/>;
  const signedIn=!!session;
  return (
    <WorldProvider>
      <ExploreProvider>
        <StatusBar style="dark"/>
        <Stack screenOptions={{
          headerStyle:{backgroundColor:theme.surface},
          headerTintColor:theme.ink,
          headerTitleStyle:{fontSize:18,fontWeight:"600"},
          contentStyle:{backgroundColor:theme.background},
          headerLeft:()=> (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Explore"
              onPress={()=>router.canGoBack()?router.back():router.replace("/")}
              style={{minHeight:48,minWidth:48,justifyContent:"center"}}
            >
              <Text style={{fontSize:16,color:theme.ink}}>Back</Text>
            </Pressable>
          ),
        }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
            <Stack.Screen name="account-setup" options={{title:"Finish your account"}}/>
            <Stack.Screen name="profile" options={{title:"Your campus self"}}/>
            <Stack.Screen name="avatar" options={{title:"Your avatar"}}/>
            <Stack.Screen name="friends" options={{title:"Friends"}}/>
            <Stack.Screen name="saved" options={{title:"Saved discoveries"}}/>
          </Stack.Protected>
          <Stack.Screen name="signup" options={{headerShown:false,gestureEnabled:false}}/>
          <Stack.Screen name="login" options={{
            title:"Your account",headerShown:signedIn,gestureEnabled:signedIn,
          }}/>
        </Stack>
      </ExploreProvider>
    </WorldProvider>
  );
}

export default function RootLayout() {
  const [loaded,error]=useFonts({PressStart2P_400Regular});
  return (
    <GestureHandlerRootView style={{flex:1}}>
      <SafeAreaProvider>
        {!loaded&&!error
          ? <LoadingScreen/>
          : <AuthProvider><CampusNavigation/></AuthProvider>}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
