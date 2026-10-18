import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  effects: [] as (() => void | (() => void))[],
  read: vi.fn(), write: vi.fn(), subscribe: vi.fn(), remove: vi.fn(),
}));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: () => void | (() => void)) => { runtime.effects.push(effect); },
}));
vi.mock('react-native', () => ({ AppState: {
  currentState: 'active', addEventListener: runtime.subscribe,
} }));
vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => { runtime.effects.push(effect); },
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: runtime.read, setItem: runtime.write },
}));
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useMapAppearance } from '../apps/mobile/src/lib/use-map-appearance';

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); runtime.effects.length = 0;
  runtime.read.mockResolvedValue('night'); runtime.write.mockResolvedValue(undefined);
  runtime.subscribe.mockReturnValue({ remove: runtime.remove });
});
afterEach(() => { vi.useRealTimers(); });

function mount(enabled: boolean) {
  let result!: ReturnType<typeof useMapAppearance>;
  function Harness() { result = useMapAppearance(enabled); return null; }
  renderToString(createElement(Harness));
  const cleanups = runtime.effects.map(effect => effect());
  return { result, unmount: () => cleanups.forEach(cleanup => cleanup?.()) };
}

describe('saved appearance experiment lifecycle', () => {
  it('does not read/write storage, subscribe, or start a clock when disabled', async () => {
    const s = mount(false);
    expect(s.result.ready).toBe(false);
    s.result.choose('night');
    await Promise.resolve(); await Promise.resolve();
    expect(runtime.read).not.toHaveBeenCalled();
    expect(runtime.write).not.toHaveBeenCalled();
    expect(runtime.subscribe).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    s.unmount();
  });
  it('loads storage only when enabled and releases its foreground listener and timer', async () => {
    const s = mount(true);
    await Promise.resolve(); await Promise.resolve();
    expect(runtime.read).toHaveBeenCalledOnce();
    expect(runtime.subscribe).toHaveBeenCalledWith('change', expect.any(Function));
    expect(vi.getTimerCount()).toBe(1);
    s.unmount();
    expect(runtime.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
