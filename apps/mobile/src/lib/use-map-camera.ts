import { startTransition, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { Gesture } from "react-native-gesture-handler";
import { cancelAnimation, useAnimatedReaction, useDerivedValue, useSharedValue, withDecay, withTiming } from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import type { MapCamera, MapSize, Point } from "./map-gesture";
import { movePan, movePinch, panTouchAnchor, type PinchAnchor } from "./map-touch";
import { SCENE_INTERVAL_MS, shouldRefreshScene } from "./map-viewport";
import { useReducedMotion } from "./use-reduced-motion";

// Only the buffered scene and the final persisted camera cross into React.
// Finger movement, pinch anchoring, momentum and layer transforms stay on UI.
export function useMapCamera(camera: MapCamera, size: MapSize,
  onCamera: (camera: MapCamera) => void,
  onTap: (point: { x: number; y: number }, camera: MapCamera) => void,
  onInteract?: () => void,
  followTarget?: Point | null, followRequest = 0) {
  const [scene, setScene] = useState(camera);
  const x = useSharedValue(camera.x), y = useSharedValue(camera.y), zoom = useSharedValue(camera.zoom);
  const lastScene = useSharedValue(camera), lastRefresh = useSharedValue(0);
  const panning = useSharedValue(false), pinching = useSharedValue(false);
  const panAnchor = useSharedValue({ x: 0, y: 0, pointers: 0 });
  const pinchAnchor = useSharedValue<PinchAnchor | null>(null);
  const allowFollowing = useSharedValue(true), lastFollowRequest = useSharedValue(followRequest);
  const wasPinched = useSharedValue(false), flight = useSharedValue(0), axes = useSharedValue(0);
  const enabled = useSharedValue(true), reduced = useReducedMotion();
  const live = useDerivedValue(() => ({ x: x.get(), y: y.get(), zoom: zoom.get() }));
  const callbacks = useRef({ onCamera, onTap, onInteract });
  const published = useRef(camera), mounted = useRef(true);
  const nativeSnapshots = useRef(new WeakSet<MapCamera>());
  useLayoutEffect(() => { callbacks.current = { onCamera, onTap, onInteract }; });
  const interact = useCallback(() => { callbacks.current.onInteract?.(); }, []);
  const refreshScene = useCallback((next: MapCamera, ticket: number) => {
    if (mounted.current && flight.get() === ticket) startTransition(() => setScene(next));
  }, [flight]);
  const publish = useCallback((next: MapCamera, ticket: number) => {
    // A finished gesture can reach JS after the next gesture has already begun on UI.
    if (!mounted.current || flight.get() !== ticket) return;
    nativeSnapshots.current.add(next);
    published.current = next;
    setScene(next);
    callbacks.current.onCamera(next);
  }, [flight]);
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
    scheduleOnRN(publish, next, flight.get());
  }, [panning, pinching, axes, x, y, zoom, lastScene, publish, flight]);
  const beginInteraction = useCallback(() => {
    "worklet";
    // This must happen on UI at first contact, before any queued GPS update can run.
    allowFollowing.set(false);
    cancelMotion();
    scheduleOnRN(interact);
  }, [allowFollowing, cancelMotion, interact]);
  useLayoutEffect(() => {
    // Persisting a native position is an acknowledgement, never a camera command.
    // Even a delayed React commit of an older snapshot must not rewind live gestures.
    if (nativeSnapshots.current.has(camera)) return;
    const old = published.current;
    if (old.x === camera.x && old.y === camera.y && old.zoom === camera.zoom) return;
    published.current = camera;
    setScene(camera);
    scheduleOnUI((next: MapCamera) => {
      "worklet";
      allowFollowing.set(false);
      cancelMotion();
      x.set(next.x); y.set(next.y); zoom.set(next.zoom);
      lastScene.set(next);
    }, camera);
  }, [camera, x, y, zoom, lastScene, cancelMotion, allowFollowing]);
  useLayoutEffect(() => {
    scheduleOnUI((target: Point | null | undefined, request: number) => {
      "worklet";
      // Only an explicit location-button press can resume follow after touching the map.
      if (request !== lastFollowRequest.get()) {
        lastFollowRequest.set(request);
        allowFollowing.set(true);
      }
      if (!target || !allowFollowing.get() || !enabled.get() || panning.get() || pinching.get()) return;
      cancelMotion();
      const next = { ...target, zoom: Math.max(18, zoom.get()) };
      x.set(next.x); y.set(next.y); zoom.set(next.zoom);
      lastScene.set(next);
      scheduleOnRN(publish, next, flight.get());
    }, followTarget, followRequest);
  }, [followTarget, followRequest, lastFollowRequest, allowFollowing, enabled, panning, pinching,
    cancelMotion, zoom, x, y, lastScene, publish, flight]);
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
    scheduleOnRN(refreshScene, next, flight.get());
  });
  // These callbacks are registered here and executed later by Gesture Handler
  // on UI; scheduleOnRN invokes the ref-backed handlers outside React render.
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan().minDistance(4).averageTouches(true)
      .onBegin(() => { beginInteraction(); if (!pinching.get()) wasPinched.set(false); })
      .onStart((e) => { panning.set(true); panAnchor.set(panTouchAnchor(e)); })
      .onUpdate((e) => {
        if (!enabled.get()) return;
        const next = movePan(live.get(), panAnchor.get(), e, size, pinching.get());
        panAnchor.set(panTouchAnchor(e));
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
        x.set(withDecay({ velocity: -e.velocityX / scale, deceleration: .993, clamp: [Math.min(0, x.get()), Math.max(320, x.get())] }, done));
        y.set(withDecay({ velocity: -e.velocityY / scale, deceleration: .993, clamp: [Math.min(0, y.get()), Math.max(320, y.get())] }, done));
      })
      .onFinalize(() => { panning.set(false); finish(); });
    const pinch = Gesture.Pinch()
      .onStart((e) => {
        beginInteraction(); pinching.set(true); wasPinched.set(true);
        pinchAnchor.set(movePinch(live.get(), null, e, size).anchor);
      })
      .onUpdate((e) => {
        if (!enabled.get()) return;
        const next = movePinch(live.get(), pinchAnchor.get(), e, size);
        pinchAnchor.set(next.anchor);
        x.set(next.camera.x); y.set(next.camera.y); zoom.set(next.camera.zoom);
      })
      .onFinalize(() => { pinching.set(false); pinchAnchor.set(null); panAnchor.set({ x: 0, y: 0, pointers: 0 }); finish(); });
    const tap = Gesture.Tap().maxDistance(8).onEnd((e, success) => {
      if (success && enabled.get() && !wasPinched.get())
        scheduleOnRN(tapAt, { x: e.x, y: e.y }, live.get());
    });
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [beginInteraction, wasPinched, panning, enabled, pinching, live, size, x, y,
    reduced, flight, axes, zoom, finish, pinchAnchor, panAnchor, tapAt]);
  /* eslint-enable react-hooks/refs */
  const zoomBy = useCallback((factor: number) => {
    scheduleOnUI(() => {
      "worklet";
      beginInteraction();
      const next = Math.max(1, Math.min(128, zoom.get() * factor));
      zoom.set(withTiming(next, { duration: reduced ? 0 : 160 }, (done) => { if (done) finish(); }));
    });
  }, [beginInteraction, zoom, reduced, finish]);
  return { live, scene, gesture, zoomBy };
}
