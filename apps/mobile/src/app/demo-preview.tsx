import { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import MapScreen from './(tabs)/index';
import AskScreen from './(tabs)/ask';
import { GameButton } from '@/components/game-ui';

// Temporary local QA harness; removed after rendered validation.
export default function DemoPreview() {
  const [screen, setScreen] = useState('map');
  if (!__DEV__) return <Redirect href="/" />;
  return <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <GameButton onPress={() => setScreen('map')}>Preview map</GameButton>
      <GameButton onPress={() => setScreen('ask')}>Preview Ask</GameButton>
    </View>
    {screen === 'map' ? <MapScreen /> : <AskScreen />}
  </View>;
}
