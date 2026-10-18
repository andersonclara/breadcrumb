import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, ColorMatrix, FilterMode, Image, MipmapMode, useImage } from '@shopify/react-native-skia';
import { Chip, Feedback, gameStyles as s } from './game-ui';
import { mapColorMatrix } from '@/lib/map-palette';

const options = [
  { id: 'plain', label: 'Plain' }, { id: 'identity', label: 'Identity' },
  { id: 'day', label: 'Day' }, { id: 'night', label: 'Night' },
] as const;
type Probe = typeof options[number]['id'];
// Plain JS constants, never animated or passed through a shared value.
const matrices = {
  identity: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  day: mapColorMatrix([1, 0, 0]),
  night: mapColorMatrix([0, 0, 1]),
};
const source = require('../../assets/campus/5-19-5.png');
const sampling = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };

export default function MapAppearanceImageProbe() {
  const [probe, setProbe] = useState<Probe>('plain');
  const [edge, setEdge] = useState(128);
  const [error, setError] = useState('');
  const onError = useCallback(() => setError('The sample image could not load. Stop and start this check to retry.'), []);
  const image = useImage(source, onError);
  return <View style={{ gap: 12 }}>
    <Text style={s.body}>
      First check Plain, then Identity. They should look the same. Try Day, then Night;
      only this sample should change color. Stop at the first option that closes the app.
    </Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(option => <Chip key={option.id} label={option.label}
        selected={probe === option.id} onPress={() => setProbe(option.id)} />)}
    </View>
    <Text accessibilityLiveRegion="polite" style={s.label}>
      Sample: {options.find(option => option.id === probe)?.label}
    </Text>
    {image ? <View accessibilityLabel={`Campus image sample, ${probe} filter`} accessible
      onLayout={event => setEdge(event.nativeEvent.layout.width)}
      style={{ width: '100%', maxWidth: 256, aspectRatio: 1 }}>
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image image={image} x={0} y={0} width={edge} height={edge} fit="fill" sampling={sampling}>
          {probe === 'plain' ? null : <ColorMatrix matrix={matrices[probe]} />}
        </Image>
      </Canvas>
    </View> : !error ? <Text style={s.muted}>Loading one campus image…</Text> : null}
    <Feedback error message={error} />
    <Text style={s.muted}>
      One static image and constant filters only. No animation, lights, or detail layers.
      This check resets to Plain when restarted.
    </Text>
  </View>;
}
