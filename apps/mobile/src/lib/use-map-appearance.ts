import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMapAppearance, mapLight, type MapAppearance } from './map-appearance';

const key = 'breadcrumb.map-appearance.v1';
export function useMapAppearance() {
  const [mode, setMode] = useState<MapAppearance>('auto');
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState('');
  const changed = useRef(false), writes = useRef(Promise.resolve());
  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(key).then(value => {
      if (mounted && !changed.current && isMapAppearance(value)) setMode(value);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  useFocusEffect(useCallback(() => {
    const refresh = () => { if (AppState.currentState === 'active') setNow(new Date()); };
    refresh();
    const timer = setInterval(refresh, 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []));
  const choose = useCallback((next: MapAppearance) => {
    changed.current = true;
    setMode(next); setNow(new Date()); setError('');
    // Serialize rapid selections so the last visible choice is also the saved one.
    writes.current = writes.current.then(() => AsyncStorage.setItem(key, next))
      .catch(() => setError('This appearance could not be saved for next time.'));
  }, []);
  const light = useMemo(() => mapLight(mode, now), [mode, now]);
  return { mode, choose, light, error };
}
