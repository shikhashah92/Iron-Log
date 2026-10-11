import { View } from 'react-native';
import { router } from 'expo-router';
import { fmtLength, fmtWeight, fromKg } from '../body';
import { longDate, plural } from '../model';
import { useLog, useTheme } from '../store';
import { goBack } from '../components';
import { Card, Header, IconButton, Row, Screen, T } from '../ui';
import { sans, space } from '../theme';

const monthName = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** Every weigh-in, newest first, by month, each with its change on the one before; tap one to edit it. */
export default function WeighIns() {
  const { log, v } = useLog();
  const { c } = useTheme();
  const units = log.settings.units ?? { weight: 'kg', length: 'cm' };
  const asc = v.weighIns;
  const list = [...asc].reverse();
  const months = [...new Set(list.map((w) => w.date.slice(0, 7)))];
  const change = (id: string) => {
    const i = asc.findIndex((x) => x.id === id);
    if (i < 1) return null;
    const d = Math.round(fromKg(asc[i].weight - asc[i - 1].weight, units.weight) * 10) / 10;
    return d;
  };
  return (
    <Screen>
      <Header title="Weigh-ins" left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} />
      <T v="small" style={{ marginBottom: space.md }}>{plural(list.length, 'weigh-in')}. Tap one to change or delete it.</T>
      {months.map((m) => {
        const rows = list.filter((w) => w.date.startsWith(m));
        return (
          <View key={m} style={{ marginBottom: space.md }}>
            <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 16, marginBottom: space.sm, marginLeft: 2 }}>{monthName(m)}</T>
            <Card pad={false} style={{ paddingHorizontal: space.lg }}>
              {rows.map((w, i) => {
                const d = change(w.id);
                return (
                  <Row key={w.id} title={fmtWeight(w.weight, units.weight)} last={i === rows.length - 1}
                    subtitle={[longDate(w.date), w.fat !== undefined ? `${w.fat}% fat` : '', w.waist ? `waist ${fmtLength(w.waist, units.length)}` : '', w.photo ? 'photo' : ''].filter(Boolean).join(' · ')}
                    right={d === null ? undefined : <T style={{ fontFamily: sans, fontWeight: '600' }} color={d === 0 ? c.muted : c.text}>{d > 0 ? `+${d}` : d === 0 ? '±0' : `−${Math.abs(d)}`} {units.weight}</T>}
                    onPress={() => router.push({ pathname: '/weigh-in', params: { id: w.id } })} />
                );
              })}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}
