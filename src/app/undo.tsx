import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { parseBackup } from '../backup';
import { longDate, dayKey, plural } from '../model';
import { listSnapshots, type Snapshot } from '../safety';
import { useLog, useTheme } from '../store';
import { goBack } from '../components';
import { confirm, notify } from '../io';
import { Card, Gap, Header, IconButton, Row, Screen, T } from '../ui';
import { space } from '../theme';

const when = (at: number) => `${longDate(dayKey(new Date(at)))}, ${new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

export default function Undo() {
  const { log, replace } = useLog();
  const { c } = useTheme();
  const [list, setList] = useState<Snapshot[] | null>(null);
  const refresh = useCallback(() => { listSnapshots().then(setList); }, []);
  useFocusEffect(refresh);

  async function restore(s: Snapshot) {
    const n = s.count;
    if (!(await confirm('Go back to this version?',
      `${when(s.at)}: ${plural(n, 'workout')}. Your current data (${plural(log.workouts.length, 'workout')}) is saved to this history first, so you can undo this too.`, 'Go back'))) return;
    try {
      await replace({ log: parseBackup(s.data).log }, 'Before going back');
      notify('Restored', `Back to ${when(s.at)}.`);
      goBack();
    } catch (e) {
      notify('Could not restore', (e as Error).message);
      refresh();
    }
  }

  return (
    <Screen>
      <Header title="Undo history" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBack()} />} />
      <T v="small">Uplift keeps your last 10 versions on this device: one at the start of each day you make changes, and one before every restore or erase.</T>
      <Gap />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        {list === null ? <View style={{ paddingVertical: space.lg }}><T v="small">Loading…</T></View>
          : list.length === 0 ? <View style={{ paddingVertical: space.lg }}><T v="small">No earlier versions yet. They appear after your first day of changes.</T></View>
          : list.map((s, i) => (
            <Row key={`${s.at}-${i}`} last={i === list.length - 1}
              left={<View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="time-outline" size={18} color={c.accent} /></View>}
              title={when(s.at)} subtitle={`${s.reason} · ${plural(s.count, 'workout')}`}
              right={<T color={c.accent} style={{ fontWeight: '600' }}>Go back</T>} onPress={() => restore(s)} />
          ))}
      </Card>
    </Screen>
  );
}
