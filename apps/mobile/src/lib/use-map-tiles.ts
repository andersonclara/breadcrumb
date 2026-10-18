import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { MapCamera, MapSize } from '@breadcrumb/shared';
import { TileCache } from './tile-cache';
import { MAX_TILE_LEVEL, OVERVIEW_TILE, tileFromKey, tileIntersectsView, visibleMapTiles, wantedMapTiles } from './map-tiles';

export function useMapTiles<T>(cache: TileCache<T>, scene: MapCamera, size: MapSize, maxLevel = MAX_TILE_LEVEL) {
  const entries = useSyncExternalStore(cache.subscribe, cache.getSnapshot, cache.getSnapshot);
  const wanted = useMemo(() => wantedMapTiles(visibleMapTiles(scene, size, 2, maxLevel)), [scene, size, maxLevel]);
  const request = useCallback(() => cache.request(wanted), [cache, wanted]);
  useFocusEffect(useCallback(() => {
    if (AppState.currentState === 'active' || AppState.currentState === null) request();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') request(); else cache.suspend();
    });
    return () => { sub.remove(); cache.suspend(); };
  }, [cache, request]));
  const tiles = useMemo(() => entries.map(entry => ({ ...entry, tile: tileFromKey(entry.key) }))
    .filter(entry => entry.key === OVERVIEW_TILE || tileIntersectsView(entry.tile, scene, size))
    .sort((a, b) => a.tile.level - b.tile.level), [entries, scene, size]);
  return { tiles, failed: cache.failed(OVERVIEW_TILE), retry: () => cache.retry() };
}
