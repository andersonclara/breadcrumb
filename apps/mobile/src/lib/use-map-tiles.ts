import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { MapCamera, MapSize } from '@breadcrumb/shared';
import { TileCache } from './tile-cache';
import { MAX_TILE_LEVEL, OVERVIEW_TILE, cachedMapTiles, mapTileLevel, visibleMapTiles, wantedMapTiles } from './map-tiles';

export function useMapTiles<T>(cache: TileCache<T>, scene: MapCamera, size: MapSize, maxLevel = MAX_TILE_LEVEL) {
  const entries = useSyncExternalStore(cache.subscribe, cache.getSnapshot, cache.getSnapshot);
  const selection = useMemo(() => visibleMapTiles(scene, size, 2, maxLevel), [scene, size, maxLevel]);
  const level = selection[0]?.level ?? mapTileLevel(scene, size, 2, maxLevel);
  const wanted = useMemo(() => wantedMapTiles(selection), [selection]);
  const request = useCallback(() => cache.request(wanted), [cache, wanted]);
  useFocusEffect(useCallback(() => {
    if (AppState.currentState === 'active' || AppState.currentState === null) request();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') request(); else cache.suspend();
    });
    return () => { sub.remove(); cache.suspend(); };
  }, [cache, request]));
  const tiles = useMemo(() => cachedMapTiles(entries, scene, size, level), [entries, scene, size, level]);
  return { tiles, failed: cache.failed(OVERVIEW_TILE), retry: () => cache.retry() };
}
