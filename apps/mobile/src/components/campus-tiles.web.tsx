// Expo browser preview uses the identical precompiled assets and tile scheduler.
// The production Next.js map is independent. Native uses the Skia canvas file.
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { MapCamera, MapSize } from '@breadcrumb/shared';
import { mapAssetInfo, mapAssets } from '@/generated/map-assets';
import { tileImageRect } from '@/lib/map-tiles';
import { TileCache } from '@/lib/tile-cache';
import { useMapTiles } from '@/lib/use-map-tiles';
import type { MapLightProbe } from '@/lib/map-lighting';

const cache = new TileCache<number>(key => new Promise((resolve, reject) => {
  const asset = mapAssets[key];
  const source = Image.resolveAssetSource ? Image.resolveAssetSource(asset) : asset as unknown as { uri: string };
  const image = new window.Image();
  image.onload = () => resolve(asset);
  image.onerror = () => reject(new Error('Could not load campus tile'));
  image.src = typeof source === 'string' ? source : source.uri;
}));
export const CampusTiles = memo(function CampusTiles({ scene, size, live }: {
  scene: MapCamera; size: MapSize; live: SharedValue<MapCamera>; colorMatrix?: number[];
  lightProbe?: MapLightProbe | null;
  lightingLevel?: number;
}) {
  const { tiles, failed, retry } = useMapTiles(cache, scene, size, mapAssetInfo.maxLevel);
  const transform = useAnimatedStyle(() => {
    const camera = live.get(), scale = Math.max(size.width, size.height) * camera.zoom / 320;
    return { transform: [{ translateX: size.width / 2 - camera.x * scale }, { translateY: size.height / 2 - camera.y * scale }, { scale }] };
  });
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
      style={[{ position: 'absolute', top: 0, left: 0, width: 320, height: 320, transformOrigin: [0, 0, 0] }, transform]}>
      {tiles.map(({ key, value, tile }) => {
        const r = tileImageRect(tile);
        return <Image key={key} source={value} resizeMode="stretch" fadeDuration={0}
          style={{ position: 'absolute', left: r.x, top: r.y, width: r.width, height: r.height, imageRendering: 'pixelated' } as never} />;
      })}
    </Animated.View>
    {failed && <Pressable accessibilityRole="button" accessibilityLabel="Retry campus map" onPress={retry}
      style={{ position: 'absolute', top: 160, alignSelf: 'center', padding: 16, backgroundColor: '#FFFCF5' }}>
      <Text>Map could not load. Tap to retry.</Text>
    </Pressable>}
  </View>;
});
