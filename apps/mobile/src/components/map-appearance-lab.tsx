import { lazy, Suspense, useState } from 'react';
import Constants from 'expo-constants';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Feedback, GameButton, gameStyles as s } from './game-ui';
import { campusSunAltitude, mapAppearances } from '@/lib/map-appearance';
import { useMapAppearance } from '@/lib/use-map-appearance';
import { theme as t } from '@/lib/theme';

const storageLabels = {
  loading: 'Reading saved choice…',
  ready: 'Choose an appearance to save it on this device.',
  saving: 'Saving choice…',
  saved: 'Choice saved on this device.',
  error: 'Choice has not been verified in storage.',
};

// The native probe module (including Skia/palette) executes only after opt-in.
const ImageProbe = lazy(() => import('./map-appearance-image-probe'));

export function MapAppearanceLab() {
  const { mode, choose, light, error, storageStatus, now } = useMapAppearance();
  const insets = useSafeAreaInsets();
  const [imageCheck, setImageCheck] = useState(false);
  return (
    <ScrollView style={s.page} contentContainerStyle={[
      s.content, { paddingBottom: Math.max(insets.bottom, 24) + 16 },
    ]}>
      <Text style={styles.eyebrow}>DEVELOPMENT · APPEARANCE TESTS</Text>
      <Text accessibilityRole="header" style={s.title}>Appearance check</Text>
      <Text style={s.body}>
        Inspect the saved appearance and UF solar clock. Reload the app to apply choices made here to Explore.
      </Text>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={s.label}>Appearance preference</Text>
        <View style={styles.choices}>
          {mapAppearances.map(option => (
            <Chip key={option.id} label={option.label} selected={mode === option.id}
              onPress={() => choose(option.id)} />
          ))}
        </View>
        <Text accessibilityLiveRegion="polite" style={s.muted}>{storageLabels[storageStatus]}</Text>
        <Feedback error message={error} />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={s.label}>Calculated blend</Text>
        {(['day', 'dusk', 'night'] as const).map((part, index) => (
          <View key={part} style={styles.reading}>
            <Text style={s.body}>{['Day', 'Dusk', 'Night'][index]}</Text>
            <Text style={styles.value}>{(light[part] * 100).toFixed(1)}%</Text>
          </View>
        ))}
        <Text style={s.muted}>
          Automatic uses the sun at UF. Day, Dusk, and Night use the selected blend.
          Original keeps the unfiltered daytime artwork.
        </Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={s.label}>Solar clock at UF</Text>
        <Text selectable style={s.body}>Sun altitude: {campusSunAltitude(now).toFixed(2)}°</Text>
        <Text selectable style={s.muted}>Last checked: {now.toISOString()}</Text>
        <Text style={s.muted}>
          Refreshes each minute while this screen is active, when you return to it,
          and when the app returns to the foreground. No location permission is needed.
        </Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={s.label}>Device test</Text>
        <Text selectable style={s.muted}>
          {Platform.OS} {Platform.Version} · Expo Go {Constants.expoVersion ?? 'not available'}
        </Text>
        <Text style={s.body}>
          Select Night and wait for “Choice saved.” Reopen this screen after a full app restart;
          Night should remain selected. Then choose Automatic, background and reopen the app,
          and check that “Last checked” advances.
        </Text>
        <Text style={s.muted}>
          Return to Explore and test pan, pinch, and location follow. Record your phone model
          along with the versions above. Colors and exterior lighting follow the saved map appearance.
          Development lighting overrides reset on restart; detail fades remain disabled.
        </Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={s.label}>Stage 2a · Static image check</Text>
        <Text style={s.muted}>
          After the settings check passes, test one small campus image here.
          This experiment stays off until you start it and does not change the Explore map.
        </Text>
        {imageCheck ? <>
          <GameButton variant="secondary" onPress={() => setImageCheck(false)}>Stop image check</GameButton>
          <Suspense fallback={<Text style={s.muted}>Opening image check…</Text>}>
            <ImageProbe />
          </Suspense>
        </> : <GameButton variant="secondary" onPress={() => setImageCheck(true)}>Start image check</GameButton>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...s.label, color: t.muted, letterSpacing: 1 },
  section: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  value: { ...s.body, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
