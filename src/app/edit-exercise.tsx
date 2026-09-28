import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GROUPS } from '../exercises';
import { newId, putExercise, WEIGHT_TYPES, type WeightType } from '../model';
import { useLog } from '../store';
import { notify } from '../io';
import { goBack } from '../components';
import { Button, Chip, Field, Gap, Header, IconButton, Screen, Segmented, T } from '../ui';
import { space } from '../theme';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 30);

/** Add a custom exercise, or edit one (`?id=`). */
export default function EditExercise() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { v, update } = useLog();
  const ed = id ? v.exercises.find((e) => e.id === id) : undefined;
  const [name, setName] = useState(ed?.name ?? '');
  const [group, setGroup] = useState(ed?.group ?? 'Chest');
  const [equip, setEquip] = useState(ed?.equip ?? '');
  const [weightType, setWeightType] = useState<WeightType>(ed?.weightType ?? 'barbell');
  const [metric, setMetric] = useState<'reps' | 'secs'>(ed?.metric ?? 'reps');
  const [setup, setSetup] = useState(ed?.setup.join('\n') ?? '');
  const [exec, setExec] = useState(ed?.exec.join('\n') ?? '');
  const [avoid, setAvoid] = useState(ed?.avoid.join('\n') ?? '');

  function save() {
    if (!name.trim()) return notify('Give the exercise a name');
    update((l) => putExercise(l, {
      id: ed?.id ?? newId('u'), name: name.trim().slice(0, 80), group, equip: equip.trim().slice(0, 60) || 'Other', weightType,
      ...(metric === 'secs' ? { metric: 'secs' as const } : {}), setup: lines(setup), exec: lines(exec), avoid: lines(avoid),
    }));
    goBack();
  }
  const area = { multiline: true, numberOfLines: 3, style: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' as const } };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={ed ? 'Edit exercise' : 'Add exercise'} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <View style={{ gap: space.md }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Landmine Press" autoFocus={!ed} />
        <View style={{ gap: space.xs }}>
          <T v="label">Muscle group</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {[...GROUPS, 'Other'].map((g) => <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />)}
          </View>
        </View>
        <Field label="Equipment" value={equip} onChangeText={setEquip} placeholder="e.g. Landmine" />
        <View style={{ gap: space.xs }}>
          <T v="label">How weight is recorded</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {WEIGHT_TYPES.map((t) => <Chip key={t.id} label={t.label} selected={weightType === t.id} onPress={() => setWeightType(t.id)} />)}
          </View>
        </View>
        <View style={{ gap: space.xs }}>
          <T v="label">Count</T>
          <Segmented value={metric} onChange={setMetric} options={[{ id: 'reps', label: 'Reps' }, { id: 'secs', label: 'Seconds (holds)' }]} />
        </View>
        <Field label="Set up cues (one per line, optional)" value={setup} onChangeText={setSetup} {...area} />
        <Field label="Execute cues" value={exec} onChangeText={setExec} {...area} />
        <Field label="Avoid cues" value={avoid} onChangeText={setAvoid} {...area} />
        {!ed && <T v="small">You can add your own photo once the exercise is saved.</T>}
        <Button title={ed ? 'Save changes' : 'Add exercise'} onPress={save} />
      </View>
      <Gap />
    </Screen>
  );
}
