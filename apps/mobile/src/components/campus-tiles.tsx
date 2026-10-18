import { memo, useEffect, useMemo } from 'react';
import { Image as NativeImage, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, ColorMatrix, Group, Image, Paint, Skia, FilterMode, MipmapMode, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import type { MapCamera, MapSize } from '@breadcrumb/shared';
import { mapAssetInfo, mapAssets } from '@/generated/map-assets';
import { mapTileOpacity, tileImageRect, type MapTile } from '@/lib/map-tiles';
import { TileCache } from '@/lib/tile-cache';
import { useMapTiles } from '@/lib/use-map-tiles';
import type { MapLight } from '@/lib/map-appearance';
import { mapColorMatrix } from '@/lib/map-palette';
import { CampusLights } from './campus-lights';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const cache = new TileCache<SkImage>(async key => {
  const source = NativeImage.resolveAssetSource(mapAssets[key]);
  if (!source?.uri) throw new Error('Missing campus tile');
  const data = await Skia.Data.fromURI(source.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not decode campus tile');
  return image;
});
const sampling = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
type TileEntry = { key: string; value: SkImage; tile: MapTile };
const CampusTileLayer = memo(function CampusTileLayer({ tiles, level, live, size, matrix }: {
  tiles: TileEntry[]; level: number; live: SharedValue<MapCamera>; size: MapSize; matrix: SharedValue<number[]>;
}) {
  const opacity = useDerivedValue(() => mapTileOpacity(level, live.get(), size), [level, live, size.width, size.height]);
  const images = tiles.map(({ key, value, tile }) => <Image key={key} image={value} {...tileImageRect(tile)} fit="fill" sampling={sampling}>
    <ColorMatrix matrix={matrix}/>
  </Image>);
  // Fade the detailed layer once, so overlapping tile gutters don't leave grid
  // lines by blending semi-transparent edges over one another.
  return level === mapAssetInfo.maxLevel
    ? <Group layer={<Paint opacity={opacity}/>}>{images}</Group>
    : <Group opacity={opacity}>{images}</Group>;
});
export const CampusTiles = memo(function CampusTiles({ scene, size, live, light }: {
  scene: MapCamera; size: MapSize; live: SharedValue<MapCamera>; light: MapLight;
}) {
  const { tiles, failed, retry } = useMapTiles(cache, scene, size, mapAssetInfo.maxLevel);
  const reduced = useReducedMotion();
  const intensity = useSharedValue([light.day, light.dusk, light.night]);
  useEffect(() => {
    intensity.set(withTiming([light.day, light.dusk, light.night], { duration: reduced ? 0 : 900 }));
  }, [intensity, light.day, light.dusk, light.night, reduced]);
  const matrix = useDerivedValue(() => mapColorMatrix(intensity.get()), [intensity]);
  const layers = useMemo(() => {
    const result = new Map<number, TileEntry[]>();
    for (const tile of tiles) {
      const layer = result.get(tile.tile.level);
      if (layer) layer.push(tile); else result.set(tile.tile.level, [tile]);
    }
    return [...result].map(([level, tiles]) => ({ level, tiles }));
  }, [tiles]);
  const transform = useDerivedValue(() => {
    const camera = live.get(), scale = Math.max(size.width, size.height) * camera.zoom / 320;
    return [{ translateX: size.width / 2 - camera.x * scale }, { translateY: size.height / 2 - camera.y * scale }, { scale }];
  }, [live, size.width, size.height]);
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Canvas pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
      <Group clip={{ x: 0, y: 0, width: size.width, height: size.height }}>
        <Group transform={transform}>
          {layers.map(({ level, tiles }) => <CampusTileLayer key={level} level={level} tiles={tiles} live={live} size={size} matrix={matrix}/>)}
        </Group>
      </Group>
      <Group transform={transform}><CampusLights intensity={intensity} live={live}/></Group>
    </Canvas>
    {failed && <Pressable accessibilityRole="button" accessibilityLabel="Retry campus map" onPress={retry}
      style={{ position: 'absolute', top: 160, alignSelf: 'center', padding: 16, backgroundColor: '#FFFCF5', borderRadius: 12 }}>
      <Text>Map could not load. Tap to retry.</Text>
    </Pressable>}
  </View>;
});
