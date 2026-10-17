import { Tabs } from "expo-router";
import { Text } from "react-native";
import { palette } from "@breadcrumb/shared";

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerStyle: { backgroundColor: palette.cream }, headerTintColor: palette.crust,
    headerTitleStyle:{fontFamily:'PressStart2P_400Regular',fontSize:9},tabBarLabelStyle:{fontFamily:'PressStart2P_400Regular',fontSize:6},
    tabBarActiveTintColor: palette.crust, tabBarInactiveTintColor: "#8B7B6E",
    tabBarStyle: { backgroundColor: palette.cream,borderTopWidth:3,borderTopColor:palette.crust },
  }}>
    <Tabs.Screen name="index" options={{ title: "Map", headerShown: false, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>◎</Text> }} />
    <Tabs.Screen name="buzz" options={{ title: "Live Buzz", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>≋</Text> }} />
    <Tabs.Screen name="communities" options={{title:"Communities",tabBarIcon:({color})=><Text style={{color,fontSize:22}}>?</Text>}}/>
    <Tabs.Screen name="ask" options={{ title: "Ask", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>?</Text> }} />
    <Tabs.Screen name="radar" options={{ title: "Radar", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>◉</Text> }} />
  </Tabs>;
}
