import { memo } from 'react';
import { Image as NativeImage, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, Image, Skia, FilterMode, MipmapMode, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { MapCamera, MapSize } from '@breadcrumb/shared';
import { mapAssetInfo, mapAssets } from '@/generated/map-assets';
import { tileImageRect } from '@/lib/map-tiles';
import { TileCache } from '@/lib/tile-cache';
import { useMapTiles } from '@/lib/use-map-tiles';

const cache = new TileCache<SkImage>(async key => {
  const source = NativeImage.resolveAssetSource(mapAssets[key]);
  if (!source?.uri) throw new Error('Missing campus tile');
  const data = await Skia.Data.fromURI(source.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not decode campus tile');
  return image;
});
const sampling = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
export const CampusTiles = memo(function CampusTiles({ scene, size, live }: {
  scene: MapCamera; size: MapSize; live: SharedValue<MapCamera>;
}) {
  const { tiles, failed, retry } = useMapTiles(cache, scene, size, mapAssetInfo.maxLevel);
  const transform = useDerivedValue(() => {
    const camera = live.get(), scale = Math.max(size.width, size.height) * camera.zoom / 320;
    return [{ translateX: size.width / 2 - camera.x * scale }, { translateY: size.height / 2 - camera.y * scale }, { scale }];
  }, [live, size.width, size.height]);
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Canvas pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
      <Group transform={transform}>
        {tiles.map(({ key, value, tile }) => <Image key={key} image={value} {...tileImageRect(tile)} fit="fill" sampling={sampling} />)}
      </Group>
    </Canvas>
    {failed && <Pressable accessibilityRole="button" accessibilityLabel="Retry campus map" onPress={retry}
      style={{ position: 'absolute', top: 160, alignSelf: 'center', padding: 16, backgroundColor: '#FFFCF5', borderRadius: 12 }}>
      <Text>Map could not load. Tap to retry.</Text>
    </Pressable>}
  </View>;
});
