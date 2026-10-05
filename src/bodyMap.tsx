import { useState } from 'react';
import { View } from 'react-native';
import Body from 'react-native-body-highlighter';
import { MUSCLES, type Muscle } from './model';
import { useTheme } from './store';
import { space } from './theme';

const SLUGS = Object.keys(MUSCLES) as Muscle[];
// The rest of the body: the library paints these its own dark grey unless told otherwise.
const REST = ['head', 'hair', 'neck', 'hands', 'feet', 'ankles', 'knees'] as const;

/** `a` blended toward `b` by t (0..1), for hex colours. */
export function mix(a: string, b: string, t: number) {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Front and back side by side, sized to the width they get. Each muscle is painted `fill(m)`; tapping one calls `onPress`. */
export function BodyMap({ fill, onPress, selected }: { fill: (m: Muscle) => string; onPress?: (m: Muscle) => void; selected?: (m: Muscle) => boolean }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const scale = Math.min(0.8, (w - space.sm) / 400); // each side is 200 × 400 at scale 1
  const skin = mix(c.card, c.chip, 0.6);
  const data = [...SLUGS.map((slug) => ({ slug, styles: { fill: fill(slug), ...(selected?.(slug) ? { stroke: c.text, strokeWidth: 4 } : {}) } })),
    ...REST.map((slug) => ({ slug, styles: { fill: skin } }))];
  const press = (p: { slug?: string }) => { if (p.slug && Object.hasOwn(MUSCLES, p.slug)) onPress?.(p.slug as Muscle); };
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
      {scale > 0 && (['front', 'back'] as const).map((side) => (
        <Body key={side} side={side} scale={scale} data={data} border="none" defaultFill={skin} onBodyPartPress={press} />
      ))}
    </View>
  );
}
