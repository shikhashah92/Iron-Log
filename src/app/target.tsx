import { useState } from 'react';
import { View } from 'react-native';
import { fmtWeight, fromKg, planRate, planWarning, toKg, trendOf } from '../body';
import { addDays, dateWithYear, putProfile, today, type WeightTarget } from '../model';
import { useLog, useTheme } from '../store';
import { notify } from '../io';
import { goBack } from '../components';
import { DateField } from '../DateField';
import { Banner, Button, Card, Field, Gap, Header, IconButton, Screen, selectAll, T } from '../ui';
import { space } from '../theme';

const r1 = (n: number) => String(Math.round(n * 10) / 10);
const parse = (t: string) => { const n = parseFloat(t.replace(',', '.')); return Number.isFinite(n) ? n : null; };

/** A target weight by a date. The plan runs from today's trend at a steady % per week; the rate and a sanity check update live. */
export default function TargetScreen() {
  const { log, v, update } = useLog();
  const { c } = useTheme();
  const units = log.settings.units ?? { weight: 'kg', length: 'cm' };
  const cur = v.profile.target;
  const trend = trendOf(v.weighIns).at(-1)?.trend;
  const iso = today();
  const [start, setStart] = useState(trend ? r1(fromKg(trend, units.weight)) : '');
  const [goal, setGoal] = useState(cur ? r1(fromKg(cur.weight, units.weight)) : '');
  const [date, setDate] = useState(cur?.date && cur.date > iso ? cur.date : addDays(iso, 84));
  const s = parse(start), g = parse(goal);
  const draft: WeightTarget | null = s && g && date > iso ? { weight: toKg(g, units.weight), date, startWeight: toKg(s, units.weight), startDate: iso } : null;
  const valid = !!draft && draft.weight >= 20 && draft.weight <= 400 && draft.startWeight >= 20 && draft.startWeight <= 400 && Math.abs(draft.weight - draft.startWeight) >= 0.1;
  const rate = valid ? planRate(draft!) : null;
  const warning = valid ? planWarning(draft!) : null;

  function save() {
    if (!valid) return notify('Check the numbers', 'Enter your current and target weight, and a date after today.');
    update((l) => putProfile(l, v.profile.id, { target: { ...draft!, weight: Math.round(draft!.weight * 100) / 100, startWeight: Math.round(draft!.startWeight * 100) / 100 } }));
    goBack();
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Target weight" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <View style={{ gap: space.md }}>
        <Field label={`Now (${units.weight})${trend ? ', your trend' : ''}`} value={start} onChangeText={setStart} inputMode="decimal" onFocus={selectAll} />
        <Field label={`Target (${units.weight})`} value={goal} onChangeText={setGoal} inputMode="decimal" autoFocus onFocus={selectAll} />
        <View style={{ gap: space.xs }}>
          <T v="label">By</T>
          <DateField value={date} onChange={setDate} min={addDays(iso, 7)} max={addDays(iso, 3 * 365)} label="Target date" />
        </View>
        {rate && (
          <Card>
            <T style={{ fontWeight: '600' }}>{rate.pctPerWeek >= 0 ? 'Lose' : 'Gain'} {Math.abs(rate.pctPerWeek).toFixed(2)}% of your weight a week</T>
            <T v="small">About {fmtWeight(Math.abs(rate.kgPerWeek), units.weight)} a week to start, easing off as you go · {dateWithYear(date)}</T>
            <T v="small" style={{ marginTop: space.xs, fontSize: 12 }}>
              The plan is a steady percentage per week, not a straight line: that’s how sustainable change tends to go. Your trend (not single weigh-ins) is compared with it.
            </T>
          </Card>
        )}
        {warning && <Banner text={warning} />}
        <Button title="Save target" onPress={save} disabled={!valid} />
        {cur && <Button title="Remove target" kind="danger" onPress={() => { update((l) => putProfile(l, v.profile.id, { target: undefined })); goBack(); }} />}
        <T v="small" color={c.muted} style={{ fontSize: 12 }}>A guide, not medical advice. Talk to a doctor before big changes, especially if you’re under 18, pregnant or have a health condition.</T>
      </View>
      <Gap />
    </Screen>
  );
}
