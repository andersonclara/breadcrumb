import { Text, View } from 'react-native';
import type { AvatarConfig } from '@breadcrumb/shared';
import { useTheme } from '@/lib/theme-context';
import { PixelAvatar } from './pixel-art';
import { PixelFrame } from './pixel-frame';
import { useGameStyles } from './game-ui';

export function AvatarStage({ avatar }: { avatar: AvatarConfig }) {
  const t = useTheme(), s = useGameStyles();
  return <View style={{ padding: 24, alignItems: 'center', gap: 16 }}>
    <PixelFrame panel fill={t.sage} />
    <Text style={s.label}>Your avatar</Text>
    <View style={{ alignItems: 'center', gap: 8 }}>
      <PixelAvatar avatar={avatar} size={84} />
      <View accessible={false} style={{ width: 96, height: 8, backgroundColor: t.border, borderLeftWidth: 8, borderRightWidth: 8, borderColor: t.sage }} />
    </View>
  </View>;
}
