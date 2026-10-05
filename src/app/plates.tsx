import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BAR, inUnit, num, PLATES, platesFor } from '../model';
import { useLog, useTheme } from '../store';
import { goBack } from '../components';
import { Field, Gap, Header, IconButton, Screen, Segmented, selectAll, T } from '../ui';
import { radius, space } from '../theme';

// Competition plate colours, so the picture matches the plates on the rack. A lb plate looks like its nearest kg one (45 lb ≈ 20 kg).
const COLOUR = ['#D93A3A', '#2F6FDB', '#E8C12E', '#2FA35B', '#F2F2F2', '#3A3A3A', '#B8BCC2'];
const HEIGHT = [150, 150, 132, 112, 84, 70, 58];
const look = (u: 'kg' | 'lb', p: number) => PLATES[u].indexOf(p as never) + (u === 'lb' ? 1 : 0);
const BARS = { kg: ['20', '15', '10'], lb: ['45', '35', '15'] } as const;

/** Which plates to load on each side for a barbell weight (`?kg=`, in kg), in the person's unit and on the bar they pick. */
export default function Plates() {
  const { kg } = useLocalSearchParams<{ kg?: string }>();
  const { c } = useTheme();
  const u = useLog().v.unit;
  const [text, setText] = useState(kg && Number(kg) > 0 ? num(inUnit(Number(kg), u)) : u === 'lb' ? '135' : '60');
  const [bar, setBar] = useState<string>(String(BAR[u]));
  const total = parseFloat(text.replace(',', '.'));
  const b = Number(bar);
  const ok = Number.isFinite(total) && total > 0;
  const { side, left } = ok ? platesFor(total, b, PLATES[u]) : { side: [], left: 0 };
  const smallest = PLATES[u].at(-1)!;
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Plate calculator" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <Field label={`Total on the bar (${u})`} value={text} onChangeText={setText} inputMode="decimal" onFocus={selectAll} style={{ fontSize: 24 }} />
      <Gap h={space.sm} />
      <Segmented value={bar} onChange={setBar} options={BARS[u].map((x, i) => ({ id: x, label: i ? `${x} ${u}` : `${x} ${u} bar` }))} />
      <Gap />
      {!ok ? <T v="small">Enter a weight.</T> : total < b ? <T v="small">That’s less than the bar ({b} {u}) on its own.</T> : (
        <>
          <T v="label">Each side</T>
          {/* One end of the bar: the sleeve, its plates (heaviest on the inside), the collar, then the bar towards the middle. */}
          <View accessibilityRole="image" accessibilityLabel={side.length ? `Each side: ${side.map((p) => `${num(p)} ${u}`).join(', ')}` : 'Just the bar'}
            style={{ flexDirection: 'row', alignItems: 'center', height: 170, marginVertical: space.md }}>
            <View style={{ width: 24, height: 22, backgroundColor: c.muted, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
            {[...side].reverse().map((p, i) => (
              <View key={i} style={{ width: look(u, p) <= 3 ? 22 : 16, height: HEIGHT[look(u, p)], marginLeft: i ? 2 : 0, borderRadius: 4, backgroundColor: COLOUR[look(u, p)], borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' }} />
            ))}
            <View style={{ width: 12, height: 44, backgroundColor: c.muted, borderRadius: 3, marginLeft: 2 }} />
            <View style={{ flex: 1, height: 14, backgroundColor: c.muted, marginLeft: 0 }} />
          </View>
          <T style={{ fontSize: 22, fontWeight: '700' }}>{side.length ? side.map((p) => num(p)).join(' + ') : 'Nothing: just the bar'}</T>
          {side.length ? <T v="small" style={{ marginTop: 2 }}>{u} on each side, heaviest first, on a {b} {u} bar.</T> : null}
          {left > 0 ? <T v="small" style={{ marginTop: space.sm, color: c.warnText }}>{num(left)} {u} can’t be made with standard plates (the smallest is {smallest} {u} a side). The nearest is {num(total - left)} {u}.</T> : null}
          <View style={{ marginTop: space.lg, backgroundColor: c.chip, borderRadius: radius.md, padding: space.md }}>
            <T v="small">{u === 'kg' ? 'Plates: 25 red · 20 blue · 15 yellow · 10 green · 5 · 2.5 · 1.25 kg.' : 'Plates: 45 · 35 · 25 · 10 · 5 · 2.5 lb.'} Clips aren’t counted.</T>
          </View>
        </>
      )}
    </Screen>
  );
}
