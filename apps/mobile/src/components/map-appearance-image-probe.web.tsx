import { Text } from 'react-native';
import { gameStyles as s } from './game-ui';

export default function MapAppearanceImageProbe() {
  return <Text style={s.body}>
    Open this check on your iPhone in Expo Go to test the native image filters.
    The browser preview cannot verify that rendering path.
  </Text>;
}
