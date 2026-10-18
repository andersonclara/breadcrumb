import { Text, View } from 'react-native';
import { DEMO_REPORT_COUNT } from '@breadcrumb/shared';
import { useExplore } from '@/providers/explore-provider';
import { GameButton, useGameStyles } from './game-ui';
import { useTheme } from '@/lib/theme-context';

export function DemoBanner() {
  const t = useTheme(), s = useGameStyles();
  const e = useExplore();
  if (!e.demo) return null;
  const clock = `${Math.floor(e.demoSeconds / 60)}:${(e.demoSeconds % 60).toString().padStart(2, '0')}`;
  return <View style={{ backgroundColor: t.surface, borderColor: t.ink, borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.label}>Demo · {clock}</Text>
        <Text style={s.muted}>{DEMO_REPORT_COUNT} simulated reports</Text>
      </View>
      <GameButton variant="secondary" onPress={e.endDemo}>End demo</GameButton>
    </View>
  </View>;
}
