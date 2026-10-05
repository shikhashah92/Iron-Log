import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { fromFtIn, ftIn, parseHeight, planWarning, toKg } from '../body';
import { addDays, GENDERS, GOALS, newId, putProfile, putWeighIn, withUnits, today, type Gender, type Goal, type Log } from '../model';
import { useLog, useTheme } from '../store';
import { notify } from '../io';
import { goBack } from '../components';
import { DateField, DobField } from '../DateField';
import { startTour } from '../tour';
import { Banner, Button, Chip, Field, Gap, Header, IconButton, Screen, Segmented, selectAll, T } from '../ui';
import { font, radius, space } from '../theme';

const parse = (t: string) => { const n = parseFloat(t.replace(',', '.')); return Number.isFinite(n) ? n : null; };

type Step = 'goal' | 'height' | 'weight' | 'target';

/**
 * About you. `?first=1`: onboarding's optional second step, one question at a time (goal, height, today's weight, and a
 * target for weight goals), then the app tour. Otherwise: edit your details (name, date of birth, gender, goal, height) from Me.
 */
export default function About() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  const onboarding = first === '1';
  const { log, v, update } = useLog();
  const { c } = useTheme();
  const [i, setI] = useState(0);
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
  /** `skip`: a question skipped on the last step (its cleared state isn't visible to this call yet). */
  function save(skip?: Step) {
    const cm = skip === 'height' ? undefined : heightCm;
    if (cm === null) return notify('That doesn’t look like a height', units.length === 'cm' ? 'Try something like 175.' : 'Try something like 5 feet 11 inches.');
    const w = kg !== null && skip !== 'weight' ? toKg(kg, units.weight) : null;
    if (w !== null && (w < 20 || w > 400)) return notify('Check your weight', `Enter it in ${units.weight}.`);
    update((l) => {
      let n: Log = putProfile(withUnits(l, units), p.id, {
        ...(onboarding ? {} : { name: name.trim().slice(0, 40) || p.name, dob: dob || undefined, gender }),
        goal: skip === 'goal' ? undefined : goal, ...(cm ? { height: cm } : {}),
        ...(draft && w !== null && skip !== 'target' && draft.weight >= 20 && draft.weight <= 400 ? { target: { ...draft, weight: Math.round(draft.weight * 100) / 100, startWeight: Math.round(draft.startWeight * 100) / 100 } } : {}),
      });
      if (w !== null) n = putWeighIn(n, { id: newId('b'), date: iso, weight: Math.round(w * 100) / 100, at: Date.now() });
      return n;
    });
    if (onboarding) done(); else goBack();
  }

  const goalChips = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {GOALS.map((g) => <Chip key={g.id} label={g.label} icon={g.icon} selected={goal === g.id} onPress={() => setGoal(goal === g.id ? undefined : g.id)} />)}
    </View>
  );
  const heightInputs = units.length === 'cm'
    ? <Field label="Height (cm)" value={cmText} onChangeText={setCmText} inputMode="decimal" onFocus={selectAll} autoFocus={onboarding} />
    : (
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}><Field label="Feet" value={ft} onChangeText={setFt} inputMode="numeric" onFocus={selectAll} autoFocus={onboarding} /></View>
        <View style={{ flex: 1 }}><Field label="Inches" value={inch} onChangeText={setInch} inputMode="decimal" onFocus={selectAll} /></View>
      </View>
    );

  if (onboarding) {
    const steps: Step[] = ['goal', 'height', 'weight', ...(wantsTarget ? ['target' as const] : [])];
    const step = steps[Math.min(i, steps.length - 1)];
    const last = i >= steps.length - 1;
    const next = () => {
      if (step === 'height' && heightCm === null) return notify('That doesn’t look like a height', units.length === 'cm' ? 'Try something like 175.' : 'Try something like 5 feet 11 inches.');
      if (step === 'weight' && kg !== null && (toKg(kg, units.weight) < 20 || toKg(kg, units.weight) > 400)) return notify('Check your weight', `Enter it in ${units.weight}.`);
      if (last) save(); else setI(i + 1);
    };
    // Nothing typed yet: Next waits for an answer, and "Skip this question" is the way past it.
    const empty = step === 'height' ? blank : step === 'weight' ? !weight.trim() : step === 'target' ? !target.trim() : false;
    /** "Skip this question": clear the answer so it isn't saved, then move on. */
    const skipOne = () => {
      if (step === 'goal') setGoal(undefined);
      if (step === 'height') { setCmText(''); setFt(''); setInch(''); }
      if (step === 'weight') setWeight('');
      if (step === 'target') setTarget('');
      if (last) save(step); else setI(i + 1);
    };
    const Q = { goal: 'What’s your main goal?', height: 'How tall are you?', weight: 'What do you weigh today?', target: 'Where would you like to get to?' }[step];
    const hint = {
      goal: 'It shapes what Uplift shows you first. Change it any time.',
      height: 'Used for BMI and the healthy range on your weight chart.',
      weight: 'Your first weigh-in: the start of your trend line.',
      target: 'A target weight and date. Uplift plans a steady weekly pace and shows it against your trend.',
    }[step];
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.lg, minHeight: 56 }}>
          {i > 0 ? <IconButton icon="chevron-back" label="Back" onPress={() => setI(i - 1)} /> : <View style={{ width: 24 }} />}
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps.length, now: i + 1 }} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.chip, overflow: 'hidden' }}>
            <View style={{ width: `${((i + 1) / steps.length) * 100}%`, height: 6, backgroundColor: c.brand }} />
          </View>
          <Button title="Skip all" kind="ghost" onPress={done} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
        </View>
        <Gap h={space.xl} />
        <T v="small" style={{ fontWeight: '600' }}>Your starting point · {i + 1} of {steps.length}</T>
        <T v="h1" style={{ fontSize: font.h1 + 2, marginTop: space.xs }}>{Q}</T>
        <T v="small" style={{ marginTop: space.xs }}>{hint}</T>
        <Gap />
        {step === 'goal' && (
          <View style={{ gap: space.sm }}>
            {GOALS.map((g) => {
              const on = goal === g.id;
              return (
                <Pressable key={g.id} accessibilityRole="radio" aria-checked={on} accessibilityLabel={g.label}
                  onPress={() => { setGoal(g.id); setI(i + 1); }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingHorizontal: space.lg, borderRadius: radius.md,
                    borderWidth: 2, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accentSoft : c.card, opacity: pressed ? 0.8 : 1 })}>
                  <Ionicons name={g.icon as keyof typeof Ionicons.glyphMap} size={24} color={c.accent} />
                  <T style={{ flex: 1, fontSize: 18, fontWeight: '600' }}>{g.label}</T>
                  {on && <Ionicons name="checkmark-circle" size={24} color={c.accent} />}
                </Pressable>
              );
            })}
          </View>
        )}
        {step === 'height' && (
          <View style={{ gap: space.md }}>
            <Segmented value={units.length} onChange={setLength} options={[{ id: 'cm', label: 'cm' }, { id: 'in', label: 'ft / in' }]} />
            {heightInputs}
          </View>
        )}
        {step === 'weight' && (
          <View style={{ gap: space.md }}>
            <Segmented value={units.weight} onChange={(w) => setUnits({ ...units, weight: w })} options={[{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }]} />
            <Field label={`Weight (${units.weight})`} value={weight} onChangeText={setWeight} inputMode="decimal" onFocus={selectAll} autoFocus onSubmitEditing={() => next()} />
          </View>
        )}
        {step === 'target' && (
          <View style={{ gap: space.md }}>
            <Field label={`Target weight (${units.weight})`} value={target} onChangeText={setTarget} inputMode="decimal" onFocus={selectAll} autoFocus />
            <View style={{ gap: space.xs }}>
              <T v="label">By</T>
              <DateField value={by} onChange={setBy} min={addDays(iso, 7)} max={addDays(iso, 3 * 365)} label="Target date" />
            </View>
            {draft && planWarning(draft) && <Banner text={planWarning(draft)!} />}
            {kg && goalKg ? <T v="small">{Math.abs(kg - goalKg).toFixed(1)} {units.weight} to {goalKg < kg ? 'lose' : 'gain'}. Your plan and trend show in Me.</T> : null}
          </View>
        )}
        <Gap h={space.xl} />
        {step !== 'goal' && <Button title={last ? 'Finish' : 'Next'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={() => next()} disabled={empty} />}
        <Button title="Skip this question" kind="ghost" onPress={skipOne} style={{ marginTop: space.sm }} />
        <Gap />
        <T v="small" center>Saved only on this phone, like everything else.</T>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="About you" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <Gap h={space.md} />
      <View style={{ gap: space.md }}>
        <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <View style={{ gap: space.xs }}>
          <T v="label">Date of birth</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <DobField value={dob} onChange={setDob} max={addDays(today(), -3652)} />
            {dob ? <Button title="Clear" kind="ghost" onPress={() => setDob('')} style={{ minHeight: 40, paddingHorizontal: space.sm }} /> : null}
          </View>
        </View>
        <View style={{ gap: space.xs }}>
          <T v="label">Gender</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {GENDERS.map((g) => <Chip key={g.id} label={g.label} selected={gender === g.id} onPress={() => setGender(gender === g.id ? undefined : g.id)} />)}
          </View>
        </View>
        <View style={{ gap: space.xs }}>
          <T v="label">Main goal</T>
          {goalChips}
        </View>
        {heightInputs}
        <Button title="Save" onPress={() => save()} />
      </View>
      <Gap />
    </Screen>
  );
}
