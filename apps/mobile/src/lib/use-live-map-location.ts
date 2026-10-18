import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { emptyMapLocation, LiveMapLocation } from './live-map-location';

export function useLiveMapLocation(identity?: string) {
  const [state, setState] = useState(emptyMapLocation);
  const active = useRef(false);
  const tracker = useMemo(() => new LiveMapLocation({
    permission: async request => {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status === 'undetermined' || (request && permission.canAskAgain && permission.status !== 'granted'))
        permission = await Location.requestForegroundPermissionsAsync();
      return permission.status === 'granted';
    },
    watch: (update, error) => Location.watchPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 1000,
      // Keep fresh fixes even while standing still; stale fixes are hidden by the tracker.
      distanceInterval: 0,
    }, update, error),
  }, setState), []);

  useFocusEffect(useCallback(() => {
    const resume = () => {
      active.current = !!identity && AppState.currentState === 'active';
      if (active.current) void tracker.start();
      else tracker.stop();
    };
    resume();
    const listener = AppState.addEventListener('change', resume);
    return () => {
      active.current = false;
      listener.remove();
      tracker.stop();
    };
  }, [identity, tracker]));

  const locate = useCallback(() => {
    if (active.current) void tracker.start(true);
  }, [tracker]);
  return { ...state, locate };
}
