import { router } from 'expo-router';
import { fmtLength, fmtWeight } from '../body';
import { longDate } from '../model';
import { useLog } from '../store';
import { goBack } from '../components';
import { Card, Header, IconButton, Row, Screen, T } from '../ui';
import { space } from '../theme';

/** Every weigh-in, newest first; tap one to edit it. */
export default function WeighIns() {
  const { log, v } = useLog();
  const units = log.settings.units ?? { weight: 'kg', length: 'cm' };
  const list = [...v.weighIns].reverse();
  return (
    <Screen>
      <Header title="Weigh-ins" left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} />
      <T v="small" style={{ marginBottom: space.md }}>{list.length} weigh-ins. Tap one to change or delete it.</T>
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        {list.map((w, i) => (
          <Row key={w.id} title={fmtWeight(w.weight, units.weight)} last={i === list.length - 1}
            subtitle={[longDate(w.date), w.fat !== undefined ? `${w.fat}% fat` : '', w.waist ? `waist ${fmtLength(w.waist, units.length)}` : '', w.photo ? 'photo' : ''].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/weigh-in', params: { id: w.id } })} />
        ))}
      </Card>
    </Screen>
  );
}
