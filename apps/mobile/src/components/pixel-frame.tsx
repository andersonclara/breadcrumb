import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/lib/theme-context';
import { isDarkTheme } from '@/lib/map-ui-theme';

// Draw the corners rather than rounding them: every step is on a 2px grid.
function outline(width: number, height: number, step = 2) {
  const corner = step * 3;
  return `M${corner} 0H${width - corner}V${step}H${width - step}V${corner}H${width}V${height - corner}H${width - step}V${height - step}H${width - corner}V${height}H${corner}V${height - step}H${step}V${height - corner}H0V${corner}H${step}V${step}H${corner}Z`;
}

export function PixelFrame({ fill, accent = false, panel = false }: { fill?: string; accent?: boolean; panel?: boolean }) {
  const t = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dark = isDarkTheme(t);
  const edge = accent ? t.buttonInk : dark ? t.border : t.ink;
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}
      onLayout={({ nativeEvent: { layout } }) => setSize(previous =>
        previous.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height })}>
      {size.width > 12 && size.height > 12 && (
        <Svg width={size.width + 4} height={size.height + 4} style={{ overflow: 'visible' }}>
          <Path d={outline(size.width - 2, size.height - 2, panel ? 4 : 2)} transform="translate(5 5)"
            fill={dark ? '#101722' : t.buttonInk} />
          <Path d={outline(size.width - 2, size.height - 2, panel ? 4 : 2)} transform="translate(1 1)"
            fill={fill ?? t.surface} stroke={edge} strokeWidth={2} strokeLinejoin="miter" />
          {panel && <Path d={outline(size.width - 12, size.height - 12)} transform="translate(6 6)"
            fill="none" stroke={t.border} strokeWidth={2} strokeLinejoin="miter" />}
          <Path d={`M8 4H${size.width - 8}M4 8V${size.height - 8}`}
            stroke={accent ? '#FFE3A3' : dark ? '#77849B' : '#FFFFFF'} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}
