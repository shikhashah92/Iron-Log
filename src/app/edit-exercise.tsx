import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ACTIVITY_GROUPS, fromName, MUSCLE_NAMES, MUSCLES, musclesOf, newId, putExercise, WEIGHT_TYPES, type Muscle, type Muscles, type WeightType } from '../model';
import { BodyMap, mix } from '../bodyMap';
import { useLog, useTheme } from '../store';
import { notify } from '../io';
import { goBack } from '../components';
import { Button, Chip, Field, Gap, Header, IconButton, Screen, Segmented, T } from '../ui';
import { radius, space } from '../theme';

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
  const [kind, setKind] = useState<'strength' | 'cardio' | 'activity' | 'yoga'>(ed?.kind ?? 'strength');
  const [setup, setSetup] = useState(ed?.setup.join('\n') ?? '');
  const [exec, setExec] = useState(ed?.exec.join('\n') ?? '');
  const [avoid, setAvoid] = useState(ed?.avoid.join('\n') ?? '');
  const { c } = useTheme();
  // Filled in from the name as it's typed, until a muscle is tapped.
  const [muscles, setMuscles] = useState<Muscles>((ed && musclesOf(ed)) || { main: [], help: [] });
  const [picked, setPicked] = useState(!!ed);
  const rename = (n: string) => { setName(n); if (!picked) setMuscles(fromName(n) ?? { main: [], help: [] }); };
  // Each tap moves a muscle along: not worked → main → helper → not worked.
  const cycle = (k: Muscle) => {
    setPicked(true);
    setMuscles(({ main, help }) => main.includes(k) ? { main: main.filter((x) => x !== k), help: [...help, k] }
      : help.includes(k) ? { main, help: help.filter((x) => x !== k) } : { main: [...main, k], help });
  };

  function save() {
    if (!name.trim()) return notify('Give the exercise a name');
    if (kind === 'strength' && !muscles.main.length) return notify('Tap the muscles it works on the body');
    update((l) => putExercise(l, {
      id: ed?.id ?? newId('u'), name: name.trim().slice(0, 80), group: kind === 'strength' ? MUSCLES[muscles.main[0]] : group,
      ...(kind === 'strength' ? { muscles } : {}), equip: equip.trim().slice(0, 60) || 'Other', weightType,
      ...(kind === 'strength' && metric === 'secs' ? { metric: 'secs' as const } : {}), ...(kind !== 'strength' ? { kind } : {}), ...(kind === 'yoga' ? { yoga: 'hold' as const } : {}),
      setup: lines(setup), exec: lines(exec), avoid: lines(avoid),
    }));
    goBack();
  }
  const area = { multiline: true, numberOfLines: 3, style: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' as const } };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={ed ? 'Edit exercise' : 'Add exercise'} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <View style={{ gap: space.md }}>
        <Field label="Name" value={name} onChangeText={rename} placeholder="e.g. Landmine Press" autoFocus={!ed} />
        <View style={{ gap: space.xs }}>
          <T v="label">Type</T>
          <Segmented value={kind} onChange={(k) => { setKind(k); if (k !== 'strength' && !(ACTIVITY_GROUPS as readonly string[]).includes(group)) setGroup(k === 'cardio' ? 'Cardio' : k === 'yoga' ? 'Yoga' : 'Classes'); }}
            options={[{ id: 'strength', label: 'Strength' }, { id: 'cardio', label: 'Cardio' }, { id: 'activity', label: 'Activity' }, { id: 'yoga', label: 'Yoga' }]} />
          <T v="small" style={{ fontSize: 12 }}>{kind === 'strength' ? 'Weight and reps.' : kind === 'cardio' ? 'Time and distance (pace and calories worked out).' : kind === 'yoga' ? 'Rounds and how long each is held.' : 'Time and intensity: a class, a match.'}</T>
        </View>
        {kind === 'strength' ? <View style={{ gap: space.xs }}>
          <T v="label">Muscles it works</T>
          <T v="small" style={{ fontSize: 12 }}>Tap a muscle on the body or below: once for a main muscle, twice for a helper (it counts half a set), a third time to clear.</T>
          <BodyMap fill={(k) => (muscles.main.includes(k) ? c.brand : muscles.help.includes(k) ? mix(c.chip, c.brand, 0.35) : mix(c.chip, c.muted, 0.25))} onPress={cycle} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(MUSCLE_NAMES) as Muscle[]).map((k) => {
              const role = muscles.main.includes(k) ? 'main' : muscles.help.includes(k) ? 'helper' : '';
              return (
                <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${MUSCLE_NAMES[k]}${role ? `, ${role}` : ', not worked'}`} onPress={() => cycle(k)}
                  style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: role === 'main' ? c.brand : role ? mix(c.chip, c.brand, 0.35) : c.chip }}>
                  <T style={{ fontSize: 14, color: role ? c.onAccent : c.text }}>{MUSCLE_NAMES[k]}</T>
                  {role === 'helper' && <T style={{ fontSize: 12, color: c.onAccent }}>· helper</T>}
                </Pressable>
              );
            })}
          </View>
        </View> : <View style={{ gap: space.xs }}>
          <T v="label">Group</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {[...ACTIVITY_GROUPS, 'Other'].map((g) => <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />)}
          </View>
        </View>}
        <Field label="Equipment" value={equip} onChangeText={setEquip} placeholder="e.g. Landmine" />
        {kind === 'strength' && <View style={{ gap: space.xs }}>
          <T v="label">How weight is recorded</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {WEIGHT_TYPES.map((t) => <Chip key={t.id} label={t.label.replaceAll('kg', v.unit)} selected={weightType === t.id} onPress={() => setWeightType(t.id)} />)}
          </View>
        </View>}
        {kind === 'strength' && <View style={{ gap: space.xs }}>
          <T v="label">Count</T>
          <Segmented value={metric} onChange={setMetric} options={[{ id: 'reps', label: 'Reps' }, { id: 'secs', label: 'Seconds (holds)' }]} />
        </View>}
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
