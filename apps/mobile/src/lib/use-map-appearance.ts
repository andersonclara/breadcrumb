import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMapAppearance, mapLight, type MapAppearance } from './map-appearance';

const key = 'breadcrumb.map-appearance.v1';
export function useMapAppearance(enabled = true) {
  const [mode, setMode] = useState<MapAppearance>('auto');
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading');
  const writes = useRef(Promise.resolve());
  const active = useRef(false), selection = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const readTicket = selection.current;
    active.current = true;
    void writes.current.then(() => {
      if (!mounted || readTicket !== selection.current) return;
      setReady(false); setStorageStatus('loading'); setError('');
      return AsyncStorage.getItem(key);
    }).then(value => {
      if (!mounted || readTicket !== selection.current) return;
      setMode(isMapAppearance(value) ? value : 'auto');
      setReady(true);
      setStorageStatus(isMapAppearance(value) ? 'saved' : 'ready');
    }).catch(() => {
      if (!mounted || readTicket !== selection.current) return;
      setError('Saved appearance could not be read. Choose a setting to try again.');
      setStorageStatus('error');
    });
    return () => { mounted = false; active.current = false; };
  }, [enabled]);
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    const refresh = () => { if (AppState.currentState === 'active') setNow(new Date()); };
    refresh();
    const timer = setInterval(refresh, 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [enabled]));
  const choose = useCallback((next: MapAppearance) => {
    if (!enabled) return;
    const ticket = ++selection.current;
    setReady(true);
    setMode(next); setNow(new Date()); setError('');
    setStorageStatus('saving');
    // Serialize rapid selections so the last visible choice is also the saved one.
    writes.current = writes.current.then(() => AsyncStorage.setItem(key, next))
      .then(() => {
        if (active.current && ticket === selection.current) setStorageStatus('saved');
      }).catch(() => {
        if (!active.current || ticket !== selection.current) return;
        setError('This appearance could not be saved for next time.');
        setStorageStatus('error');
      });
  }, [enabled]);
  const light = useMemo(() => mapLight(mode, now), [mode, now]);
  return { mode, choose, light, error, storageStatus, now, ready };
}
