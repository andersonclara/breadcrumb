import { startTransition, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { Gesture } from "react-native-gesture-handler";
import { cancelAnimation, useAnimatedReaction, useDerivedValue, useSharedValue, withDecay, withTiming } from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { panCamera, screenToWorld, zoomCamera, type MapCamera, type MapSize } from "./map-gesture";
import { SCENE_INTERVAL_MS, shouldRefreshScene } from "./map-viewport";
import { useReducedMotion } from "./use-reduced-motion";

// Only the buffered scene and the final persisted camera cross into React.
// Finger movement, pinch anchoring, momentum and layer transforms stay on UI.
export function useMapCamera(camera: MapCamera, size: MapSize,
  onCamera: (camera: MapCamera) => void,
  onTap: (point: { x: number; y: number }, camera: MapCamera) => void) {
  const [scene, setScene] = useState(camera);
  const x = useSharedValue(camera.x), y = useSharedValue(camera.y), zoom = useSharedValue(camera.zoom);
  const lastScene = useSharedValue(camera), lastRefresh = useSharedValue(0);
  const panning = useSharedValue(false), pinching = useSharedValue(false);
  const pinchStart = useSharedValue(camera.zoom), anchor = useSharedValue({ x: camera.x, y: camera.y });
  const wasPinched = useSharedValue(false), flight = useSharedValue(0), axes = useSharedValue(0);
  const enabled = useSharedValue(true), reduced = useReducedMotion();
  const live = useDerivedValue(() => ({ x: x.get(), y: y.get(), zoom: zoom.get() }));
  const callbacks = useRef({ onCamera, onTap });
  const published = useRef(camera), mounted = useRef(true);
  useLayoutEffect(() => { callbacks.current = { onCamera, onTap }; });
  const refreshScene = useCallback((next: MapCamera) => {
    if (mounted.current) startTransition(() => setScene(next));
  }, []);
  const publish = useCallback((next: MapCamera) => {
    if (!mounted.current) return;
    published.current = next;
    setScene(next);
    callbacks.current.onCamera(next);
  }, []);
  const tapAt = useCallback((point: { x: number; y: number }, at: MapCamera) => {
    if (mounted.current) callbacks.current.onTap(point, at);
  }, []);
  const cancelMotion = useCallback(() => {
    "worklet";
    flight.set(flight.get() + 1);
    axes.set(0);
    cancelAnimation(x); cancelAnimation(y); cancelAnimation(zoom);
  }, [flight, axes, x, y, zoom]);
  const finish = useCallback(() => {
    "worklet";
    if (panning.get() || pinching.get() || axes.get()) return;
    const next = { x: x.get(), y: y.get(), zoom: zoom.get() };
    lastScene.set(next);
    scheduleOnRN(publish, next);
  }, [panning, pinching, axes, x, y, zoom, lastScene, publish]);
  useLayoutEffect(() => {
    const old = published.current;
    if (old.x === camera.x && old.y === camera.y && old.zoom === camera.zoom) return;
    published.current = camera;
    setScene(camera);
    scheduleOnUI((next: MapCamera) => {
      "worklet";
      cancelMotion();
      x.set(next.x); y.set(next.y); zoom.set(next.zoom);
      lastScene.set(next);
    }, camera);
  }, [camera, x, y, zoom, lastScene, cancelMotion]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; scheduleOnUI(cancelMotion); };
  }, [cancelMotion]);
  useFocusEffect(useCallback(() => {
    enabled.set(true);
    const stop = () => scheduleOnUI(() => {
      "worklet";
      enabled.set(false);
      cancelMotion(); panning.set(false); pinching.set(false);
      finish();
    });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") enabled.set(true);
      else stop();
    });
    return () => { sub.remove(); stop(); };
  }, [enabled, cancelMotion, panning, pinching, finish]));
  useAnimatedReaction(() => live.get(), (next) => {
    if (!enabled.get() || !shouldRefreshScene(next, lastScene.get(), size)) return;
    const now = performance.now();
    if (now - lastRefresh.get() < SCENE_INTERVAL_MS) return;
    lastRefresh.set(now);
    lastScene.set(next);
    scheduleOnRN(refreshScene, next);
  });
  // These callbacks are registered here and executed later by Gesture Handler
  // on UI; scheduleOnRN invokes the ref-backed handlers outside React render.
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan().minDistance(4).averageTouches(true)
      .onBegin(() => { cancelMotion(); wasPinched.set(false); })
      .onStart(() => { panning.set(true); })
      .onChange((e) => {
        if (!enabled.get() || pinching.get() || e.numberOfPointers !== 1) return;
        const next = panCamera(live.get(), { x: e.changeX, y: e.changeY }, size);
        x.set(next.x); y.set(next.y);
      })
      .onEnd((e, success) => {
        if (!success || reduced || wasPinched.get() || pinching.get() || !enabled.get() ||
          Math.hypot(e.velocityX, e.velocityY) < 80) return;
        const ticket = flight.get() + 1;
        flight.set(ticket);
        axes.set(2);
        const scale = Math.max(size.width, size.height) * zoom.get() / 320;
        const done = (finished?: boolean) => {
          "worklet";
          if (!finished || flight.get() !== ticket) return;
          axes.set(axes.get() - 1);
          finish();
        };
        x.set(withDecay({ velocity: -e.velocityX / scale, deceleration: .993, clamp: [0, 320] }, done));
        y.set(withDecay({ velocity: -e.velocityY / scale, deceleration: .993, clamp: [0, 320] }, done));
      })
      .onFinalize(() => { panning.set(false); finish(); });
    const pinch = Gesture.Pinch()
      .onStart((e) => {
        cancelMotion(); pinching.set(true); wasPinched.set(true);
        pinchStart.set(zoom.get());
        anchor.set(screenToWorld(live.get(), { x: e.focalX, y: e.focalY }, size));
      })
      .onUpdate((e) => {
        if (!enabled.get()) return;
        const next = zoomCamera(pinchStart.get(), e.scale, anchor.get(), { x: e.focalX, y: e.focalY }, size);
        x.set(next.x); y.set(next.y); zoom.set(next.zoom);
      })
      .onFinalize(() => { pinching.set(false); finish(); });
    const tap = Gesture.Tap().maxDistance(8).onEnd((e, success) => {
      if (success && enabled.get() && !wasPinched.get())
        scheduleOnRN(tapAt, { x: e.x, y: e.y }, live.get());
    });
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [cancelMotion, wasPinched, panning, enabled, pinching, live, size, x, y,
    reduced, flight, axes, zoom, finish, pinchStart, anchor, tapAt]);
  /* eslint-enable react-hooks/refs */
  const zoomBy = useCallback((factor: number) => scheduleOnUI(() => {
    "worklet";
    cancelMotion();
    const next = Math.max(1, Math.min(128, zoom.get() * factor));
    zoom.set(withTiming(next, { duration: reduced ? 0 : 160 }, (done) => { if (done) finish(); }));
  }), [cancelMotion, zoom, reduced, finish]);
  return { live, scene, gesture, zoomBy };
}
