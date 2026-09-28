import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { num, platesFor } from '../model';
import { useTheme } from '../store';
import { goBack } from '../components';
import { Field, Gap, Header, IconButton, Screen, Segmented, selectAll, T } from '../ui';
import { radius, space } from '../theme';

// Competition plate colours, so the picture matches the plates on the rack.
const COLOUR: Record<number, string> = { 25: '#D93A3A', 20: '#2F6FDB', 15: '#E8C12E', 10: '#2FA35B', 5: '#F2F2F2', 2.5: '#3A3A3A', 1.25: '#B8BCC2' };
const HEIGHT: Record<number, number> = { 25: 150, 20: 150, 15: 132, 10: 112, 5: 84, 2.5: 70, 1.25: 58 };
const BARS = [{ id: '20', label: '20 kg bar' }, { id: '15', label: '15 kg' }, { id: '10', label: '10 kg' }] as const;

/** Which plates to load on each side for a barbell weight (`?kg=`), on a 20, 15 or 10 kg bar. */
export default function Plates() {
  const { kg } = useLocalSearchParams<{ kg?: string }>();
  const { c } = useTheme();
  const [text, setText] = useState(kg && Number(kg) > 0 ? num(Number(kg)) : '60');
  const [bar, setBar] = useState<(typeof BARS)[number]['id']>('20');
  const total = parseFloat(text.replace(',', '.'));
  const b = Number(bar);
  const ok = Number.isFinite(total) && total > 0;
  const { side, left } = ok ? platesFor(total, b) : { side: [], left: 0 };
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Plate calculator" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <Field label="Total on the bar (kg)" value={text} onChangeText={setText} inputMode="decimal" onFocus={selectAll} style={{ fontSize: 24 }} />
      <Gap h={space.sm} />
      <Segmented value={bar} onChange={setBar} options={[...BARS]} />
      <Gap />
      {!ok ? <T v="small">Enter a weight.</T> : total < b ? <T v="small">That’s less than the bar ({b} kg) on its own.</T> : (
        <>
          <T v="label">Each side</T>
          {/* One end of the bar: the sleeve, its plates (heaviest on the inside), the collar, then the bar towards the middle. */}
          <View accessibilityRole="image" accessibilityLabel={side.length ? `Each side: ${side.map((p) => `${num(p)} kg`).join(', ')}` : 'Just the bar'}
            style={{ flexDirection: 'row', alignItems: 'center', height: 170, marginVertical: space.md }}>
            <View style={{ width: 24, height: 22, backgroundColor: c.muted, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
            {[...side].reverse().map((p, i) => (
              <View key={i} style={{ width: p >= 10 ? 22 : 16, height: HEIGHT[p], marginLeft: i ? 2 : 0, borderRadius: 4, backgroundColor: COLOUR[p], borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' }} />
            ))}
            <View style={{ width: 12, height: 44, backgroundColor: c.muted, borderRadius: 3, marginLeft: 2 }} />
            <View style={{ flex: 1, height: 14, backgroundColor: c.muted, marginLeft: 0 }} />
          </View>
          <T style={{ fontSize: 22, fontWeight: '700' }}>{side.length ? side.map((p) => num(p)).join(' + ') : 'Nothing: just the bar'}</T>
          {side.length ? <T v="small" style={{ marginTop: 2 }}>kg on each side, heaviest first, on a {b} kg bar.</T> : null}
          {left > 0 ? <T v="small" style={{ marginTop: space.sm, color: c.warnText }}>{num(left)} kg can’t be made with standard plates (the smallest is 1.25 kg a side). The nearest is {num(total - left)} kg.</T> : null}
          <View style={{ marginTop: space.lg, backgroundColor: c.chip, borderRadius: radius.md, padding: space.md }}>
            <T v="small">Plates: 25 red · 20 blue · 15 yellow · 10 green · 5 · 2.5 · 1.25 kg. Clips aren’t counted.</T>
          </View>
        </>
      )}
    </Screen>
  );
}
