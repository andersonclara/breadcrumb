import { Circle, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { MapCamera } from '@breadcrumb/shared';

// Art-directed fixtures in campus world coordinates. Stadium perimeter lighting
// intentionally leaves the field dark; this is scenery, not live venue status.
const lamps = [
  // South edge of the mapped University Avenue segment.
  ...Array.from({ length: 14 }, (_, i) => ({ x: 196 + i * 3.4, y: 37.18 + i * .013 })),
  ...[53, 60, 67].flatMap(y => [{ x: 190.2, y }, { x: 207.7, y: y - 1 }]),
  { x: 195, y: 72.4 }, { x: 202, y: 72.4 },
  { x: 233.8, y: 82.1 }, { x: 238.2, y: 82.1 },
  { x: 242, y: 53 }, { x: 246, y: 53 }, { x: 241.1, y: 73.2 },
];
export function CampusLights({ intensity, live }: { intensity: SharedValue<number[]>; live: SharedValue<MapCamera> }) {
  const opacity = useDerivedValue(() => {
    const detail = Math.max(0, Math.min(1, (live.get().zoom - 4) / 4));
    const light = intensity.get();
    return (light[2] + light[1] * .4) * detail;
  }, [intensity, live]);
  return <Group opacity={opacity}>
    {lamps.map((p, i) => <Group key={i}>
      <Circle cx={p.x} cy={p.y} r={1.65}>
        <RadialGradient c={vec(p.x, p.y)} r={1.65} colors={['#FFD28B68', '#F4BC5528', '#F4BC5500']} positions={[0, .3, 1]}/>
      </Circle>
      <Circle cx={p.x} cy={p.y} r={.09} color="#FFE6B5"/>
    </Group>)}
  </Group>;
}
