import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapCamera } from '@breadcrumb/shared';

// Drive the actual camera hook with independently queued UI/JS work, so a slow
// React thread can be reproduced without a native device or real-time timers.
const runtime = vi.hoisted(() => ({
  effects: [] as (() => unknown)[], ui: [] as (() => void)[], rn: [] as (() => void)[],
  handlers: {} as Record<string, Record<string, (...args: never[]) => void>>,
}));
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>();
  return { ...react, useLayoutEffect: (effect: () => unknown) => { runtime.effects.push(effect); } };
});
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('expo-router', () => ({ useFocusEffect: () => {} }));
vi.mock('../apps/mobile/src/lib/use-reduced-motion', () => ({ useReducedMotion: () => false }));
vi.mock('react-native-worklets', () => ({
  scheduleOnUI: (fn: (...args: unknown[]) => void, ...args: unknown[]) => runtime.ui.push(() => fn(...args)),
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => runtime.rn.push(() => fn(...args)),
}));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return {
    useSharedValue: <T,>(value: T) => useRef({ get: () => value, set: (next: T) => { value = next; } }).current,
    useDerivedValue: (read: () => unknown) => ({ get: read }),
    useAnimatedReaction: () => {}, cancelAnimation: () => {},
    withDecay: () => 0, withTiming: (next: number) => next,
  };
});
vi.mock('react-native-gesture-handler', () => {
  const gesture = (name: string) => {
    const callbacks: Record<string, (...args: never[]) => void> = {};
    runtime.handlers[name] = callbacks;
    const builder: Record<string, unknown> = {};
    for (const key of ['onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize'])
      builder[key] = (fn: (...args: never[]) => void) => { callbacks[key] = fn; return builder; };
    for (const key of ['minDistance', 'averageTouches', 'maxDistance']) builder[key] = () => builder;
    return builder;
  };
  return { Gesture: { Pan: () => gesture('pan'), Pinch: () => gesture('pinch'), Tap: () => gesture('tap'),
    Race: () => ({}), Simultaneous: () => ({}) } };
});
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useMapCamera } from '../apps/mobile/src/lib/use-map-camera';

const drain = (queue: (() => unknown)[]) => { while (queue.length) queue.shift()!(); };
function setup(followTarget?: { x: number; y: number }) {
  const camera: MapCamera = { x: 140, y: 110, zoom: 12 };
  const onCamera = vi.fn(), onInteract = vi.fn();
  let result!: ReturnType<typeof useMapCamera>;
  function Harness() {
    result = useMapCamera(camera, { width: 390, height: 844 }, onCamera, () => {}, onInteract, followTarget);
    return null;
  }
  renderToString(createElement(Harness)); drain(runtime.effects);
  const event = (name: string, phase: string, data?: unknown) => runtime.handlers[name][phase](data as never);
  return { camera, result, onCamera, onInteract, event };
}
beforeEach(() => { runtime.effects.length = 0; runtime.ui.length = 0; runtime.rn.length = 0; runtime.handlers = {}; });

describe('camera ownership across queued native/React work', () => {
  it('still follows GPS when the map has not been touched', () => {
    const s = setup({ x: 180, y: 140 });
    drain(runtime.ui); drain(runtime.rn);
    expect(s.result.live.get()).toEqual({ x: 180, y: 140, zoom: 18 });
    expect(s.onCamera).toHaveBeenCalledWith({ x: 180, y: 140, zoom: 18 });
  });
  it('rejects a queued GPS recenter as soon as a finger touches the map, before React is notified', () => {
    const s = setup({ x: 180, y: 140 });
    s.event('pan', 'onBegin');
    expect(s.onInteract).not.toHaveBeenCalled();
    drain(runtime.ui);
    expect(s.result.live.get()).toEqual(s.camera);
    drain(runtime.rn);
    expect(s.onInteract).toHaveBeenCalledOnce();
    expect(s.onCamera).not.toHaveBeenCalled();
  });
  it('does not publish an old gesture endpoint after the next gesture has started', () => {
    const s = setup(); drain(runtime.ui);
    s.event('pan', 'onBegin');
    s.event('pan', 'onStart', { translationX: 4, translationY: 0, numberOfPointers: 1 });
    s.event('pan', 'onUpdate', { translationX: 44, translationY: 10, numberOfPointers: 1 });
    s.event('pan', 'onFinalize');
    const previous = s.result.live.get();
    s.event('pan', 'onBegin');
    s.event('pan', 'onStart', { translationX: 4, translationY: 0, numberOfPointers: 1 });
    s.event('pan', 'onUpdate', { translationX: 24, translationY: 0, numberOfPointers: 1 });
    const current = s.result.live.get();
    expect(current.x).not.toBe(previous.x);
    drain(runtime.rn);
    expect(s.onCamera).not.toHaveBeenCalled();
    expect(s.result.live.get()).toEqual(current);
    s.event('pan', 'onFinalize'); drain(runtime.rn);
    expect(s.onCamera).toHaveBeenCalledWith(current);
  });
});
