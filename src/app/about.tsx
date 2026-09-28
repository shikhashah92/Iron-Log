import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fromFtIn, ftIn, parseHeight, planWarning, toKg } from '../body';
import { addDays, GENDERS, GOALS, newId, putProfile, putWeighIn, today, type Gender, type Goal, type Log } from '../model';
import { useLog } from '../store';
import { notify } from '../io';
import { goBack } from '../components';
import { DateField } from '../DateField';
import { startTour } from '../tour';
import { Banner, Button, Chip, Field, Gap, Header, IconButton, Screen, Segmented, selectAll, T } from '../ui';
import { space } from '../theme';

const parse = (t: string) => { const n = parseFloat(t.replace(',', '.')); return Number.isFinite(n) ? n : null; };

/**
 * About you. `?first=1`: onboarding's optional second step (goal, height, today's weight, a target), then the app tour.
 * Otherwise: edit your details (name, date of birth, gender, goal, height) from Me.
 */
export default function About() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  const onboarding = first === '1';
  const { log, v, update } = useLog();
  const p = v.profile;
  const [units, setUnits] = useState(log.settings.units ?? { weight: 'kg' as const, length: 'cm' as const });
  const [name, setName] = useState(p.name);
  const [dob, setDob] = useState(p.dob ?? '');
  const [gender, setGender] = useState<Gender | undefined>(p.gender);
  const [goal, setGoal] = useState<Goal | undefined>(p.goal);
  const [cmText, setCmText] = useState(p.height ? String(Math.round(p.height)) : '');
  const [ft, setFt] = useState(p.height ? String(ftIn(p.height)[0]) : '');
  const [inch, setInch] = useState(p.height ? String(ftIn(p.height)[1]) : '');
  const blank = units.length === 'cm' ? !cmText.trim() : !ft.trim() && !inch.trim();
  const heightCm = blank ? undefined : units.length === 'cm' ? parseHeight(cmText, 'cm') : fromFtIn(ft, inch);
  /** Switching cm ↔ ft/in carries a typed height across. */
  function setLength(length: 'cm' | 'in') {
    if (heightCm) { setCmText(String(Math.round(heightCm))); setFt(String(ftIn(heightCm)[0])); setInch(String(ftIn(heightCm)[1])); }
    setUnits({ ...units, length });
  }
  const [weight, setWeight] = useState('');
  const [target, setTarget] = useState('');
  const iso = today();
  const [by, setBy] = useState(addDays(iso, 84));
  const kg = parse(weight), goalKg = parse(target);
  const wantsTarget = onboarding && (goal === 'lose' || goal === 'muscle') && !!kg;
  const draft = wantsTarget && goalKg && Math.abs(goalKg - kg!) >= 0.1
    ? { weight: toKg(goalKg, units.weight), date: by, startWeight: toKg(kg!, units.weight), startDate: iso } : null;

  function done() {
    update((l) => ({ ...l, settings: { ...l.settings, setupPending: undefined } }));
    goBack();
    startTour();
  }
  function save() {
    const cm = heightCm;
    if (cm === null) return notify('That doesn’t look like a height', units.length === 'cm' ? 'Try something like 175.' : 'Try something like 5 feet 11 inches.');
    const w = kg !== null ? toKg(kg, units.weight) : null;
    if (w !== null && (w < 20 || w > 400)) return notify('Check your weight', `Enter it in ${units.weight}.`);
    update((l) => {
      let n: Log = putProfile({ ...l, settings: { ...l.settings, units } }, p.id, {
        ...(onboarding ? {} : { name: name.trim().slice(0, 40) || p.name, dob: dob || undefined, gender }),
        goal, ...(cm ? { height: cm } : {}),
        ...(draft && draft.weight >= 20 && draft.weight <= 400 ? { target: { ...draft, weight: Math.round(draft.weight * 100) / 100, startWeight: Math.round(draft.startWeight * 100) / 100 } } : {}),
      });
      if (w !== null) n = putWeighIn(n, { id: newId('b'), date: iso, weight: Math.round(w * 100) / 100, at: Date.now() });
      return n;
    });
    if (onboarding) done(); else goBack();
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={onboarding ? 'Your starting point' : 'About you'}
        right={onboarding ? <Button title="Skip" kind="ghost" onPress={done} style={{ minHeight: 40, paddingHorizontal: space.sm }} /> : <IconButton icon="close" label="Close" onPress={goBack} />} />
      {onboarding && <T v="small">Optional. It sets up your charts and plan; you can change any of it later in Me.</T>}
      <Gap h={space.md} />
      <View style={{ gap: space.md }}>
        {!onboarding && (
          <>
            <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
            <View style={{ gap: space.xs }}>
              <T v="label">Date of birth</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <DateField value={dob} onChange={setDob} min="1900-01-01" label="Date of birth" />
                {dob ? <Button title="Clear" kind="ghost" onPress={() => setDob('')} style={{ minHeight: 40, paddingHorizontal: space.sm }} /> : null}
              </View>
            </View>
            <View style={{ gap: space.xs }}>
              <T v="label">Gender</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {GENDERS.map((g) => <Chip key={g.id} label={g.label} selected={gender === g.id} onPress={() => setGender(gender === g.id ? undefined : g.id)} />)}
              </View>
            </View>
          </>
        )}
        <View style={{ gap: space.xs }}>
          <T v="label">Main goal</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {GOALS.map((g) => <Chip key={g.id} label={g.label} icon={g.icon} selected={goal === g.id} onPress={() => setGoal(goal === g.id ? undefined : g.id)} />)}
          </View>
        </View>
        {onboarding && (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><Segmented value={units.weight} onChange={(w) => setUnits({ ...units, weight: w })} options={[{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }]} /></View>
            <View style={{ flex: 1 }}><Segmented value={units.length} onChange={setLength} options={[{ id: 'cm', label: 'cm' }, { id: 'in', label: 'ft / in' }]} /></View>
          </View>
        )}
        {units.length === 'cm'
          ? <Field label="Height (cm)" value={cmText} onChangeText={setCmText} inputMode="decimal" onFocus={selectAll} />
          : (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}><Field label="Height (feet)" value={ft} onChangeText={setFt} inputMode="numeric" onFocus={selectAll} /></View>
              <View style={{ flex: 1 }}><Field label="Inches" value={inch} onChangeText={setInch} inputMode="decimal" onFocus={selectAll} /></View>
            </View>
          )}
        {onboarding && <Field label={`Weight today (${units.weight})`} value={weight} onChangeText={setWeight} inputMode="decimal" onFocus={selectAll} />}
        {wantsTarget && (
          <>
            <Field label={`Target weight (${units.weight}), optional`} value={target} onChangeText={setTarget} inputMode="decimal" onFocus={selectAll} />
            {!!goalKg && (
              <View style={{ gap: space.xs }}>
                <T v="label">By</T>
                <DateField value={by} onChange={setBy} min={addDays(iso, 7)} max={addDays(iso, 3 * 365)} label="Target date" />
              </View>
            )}
            {draft && planWarning(draft) && <Banner text={planWarning(draft)!} />}
            {kg && goalKg ? <T v="small">{Math.abs(kg - goalKg).toFixed(1)} {units.weight} to {goalKg < kg ? 'lose' : 'gain'}. Your plan and trend show in Me.</T> : null}
          </>
        )}
        <Button title={onboarding ? 'Continue' : 'Save'} onPress={save} />
        {onboarding && <T v="small" center>Saved only on this phone, like everything else.</T>}
      </View>
      <Gap />
    </Screen>
  );
}
