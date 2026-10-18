import { Redirect } from 'expo-router';
import { MapAppearanceLab } from '@/components/map-appearance-lab';

export default function MapAppearanceLabScreen() {
  return __DEV__ ? <MapAppearanceLab /> : <Redirect href="/" />;
}
