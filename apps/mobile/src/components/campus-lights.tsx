import { memo } from 'react';
import { Circle, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import { campusLamps, type MapLightProbe } from '@/lib/map-lighting';

// Plain JS props only: no shared appearance array, timing animation, new
// surface, or offscreen Paint layer. Opacity is supplied by buffered map state.
export const CampusLights = memo(function CampusLights({ probe, opacity = 1 }: {
  probe: MapLightProbe; opacity?: number;
}) {
  if (opacity <= 0) return null;
  const single = probe.mode === 'solid' || probe.mode === 'glow';
  const lamps = single ? [probe.point] : campusLamps;
  return <Group opacity={opacity}>
    {lamps.map((p, i) => <Group key={i}>
      {probe.mode !== 'solid' && <Circle cx={p.x} cy={p.y} r={1.65}>
        <RadialGradient c={vec(p.x, p.y)} r={1.65} colors={['#FFD28B68', '#F4BC5528', '#F4BC5500']} positions={[0, .3, 1]}/>
      </Circle>}
      <Circle cx={p.x} cy={p.y} r={single ? .16 : .09} color="#FFE6B5"/>
    </Group>)}
  </Group>;
});
