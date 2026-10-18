import { theme, type Theme } from './theme';
import type { MapAppearance, MapLight } from './map-appearance';

const dusk: Theme = {
  ...theme,
  background: '#E7D5C9', surface: '#F3E4D9', border: '#C5A99A',
  ink: '#49332E', muted: '#705247', sage: '#DEDCCB',
};
const night: Theme = {
  ...theme,
  background: '#171E2B', surface: '#232C3B', border: '#536077',
  ink: '#FFF7E8', muted: '#C6CAD5', sage: '#34483F',
  success: '#A5D6AC', danger: '#FFB5A8', dangerSurface: '#4C3036',
  crumbSurface: '#504333', backdrop: '#080D18A6',
};

function channels(hex: string) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}
function luminance(hex: string) {
  const rgb = channels(hex).map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
function readable(preferred: string, backgrounds: string[]) {
  const score = (color: string) => Math.min(...backgrounds.map(bg => contrast(color, bg)));
  if (score(preferred) >= 4.5) return preferred;
  return score('#000000') > score('#FFFFFF') ? '#000000' : '#FFFFFF';
}

// Reuse the map's solar blend and readiness gate; no second clock or preference.
export function mapUITheme({ mode, light, ready, enabled }: {
  mode: MapAppearance; light: MapLight; ready: boolean; enabled: boolean;
}): Theme {
  if (!enabled || !ready || mode === 'original' || light.day === 1) return theme;
  const blend = (key: keyof Theme) => {
    const colors = [theme[key], dusk[key], night[key]].map(channels);
    return '#' + colors[0].map((value, index) => Math.round(
      value * light.day + colors[1][index] * light.dusk + colors[2][index] * light.night,
    ).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const result = Object.fromEntries(Object.keys(theme).map(key => [key, blend(key as keyof Theme)])) as Theme;
  // Interpolating text through gray would lose contrast midway through sunset.
  const foreground = light.night > .5 ? night : dusk;
  result.ink = readable(foreground.ink, [result.surface]);
  result.muted = readable(foreground.muted, [result.surface]);
  // Keep tinted surfaces in the same readable range as the main surface.
  for (const key of ['background', 'sage', 'crumbSurface'] as const) {
    const source = channels(result[key]), target = channels(result.surface);
    for (let step = 0; step <= 20; step++) {
      const color = '#' + source.map((value, index) => Math.round(
        value + (target[index] - value) * step / 20,
      ).toString(16).padStart(2, '0')).join('').toUpperCase();
      if (contrast(result.ink, color) >= 4.5 && contrast(result.muted, color) >= 4.5) {
        result[key] = color;
        break;
      }
    }
  }
  result.success = readable(foreground.success, [result.surface]);
  result.danger = readable(foreground.danger, [result.dangerSurface]);
  result.backdrop = light.night > .5 ? night.backdrop : theme.backdrop;
  return result;
}

export const isDarkTheme = (palette: Theme) => luminance(palette.ink) > luminance(palette.surface);
