import type { MapAppearance, MapLight } from './map-appearance';
import { mapColorMatrix } from './map-palette';

export function mapAppearanceMatrix({ mode, light, ready, enabled }: {
  mode: MapAppearance; light: MapLight; ready: boolean; enabled: boolean;
}): number[] | undefined {
  // A saved Original choice must never briefly allocate a filter before storage
  // finishes loading. A failed read also stays unfiltered.
  if (!enabled || !ready || mode === 'original') return undefined;
  return mapColorMatrix([light.day, light.dusk, light.night]);
}
