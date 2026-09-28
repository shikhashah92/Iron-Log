import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  bmi, bmiLabel, fmtHeight, fmtLength, fmtWeight, fromKg, healthyRange, parseHeight, planCurve, planRate, planStatus, reminderICS,
  trendChange, trendOf, weighInDue, type WeighEvery,
} from '../../body';
import { dateWithYear, imgKey, MEASURES, putProfile, today } from '../../model';
import { useLog, useTheme } from '../../store';
import { ask, notify, saveFile } from '../../io';
import { Empty, RANGES, rangeLabel, rangeStart, Section, Stat, TimeChart, type Range } from '../../components';
import { Button, Card, Gap, Header, IconButton, Row, Screen, Segmented, T } from '../../ui';
import { font, mono, space } from '../../theme';

/** You: weight, its trend and your target, body measurements, and settings. */
export default function Me() {
  const { log, v, update, images } = useLog();
  const { c } = useTheme();
  const [range, setRange] = useState<Range>('3m');
  const units = log.settings.units ?? { weight: 'kg', length: 'cm' };
  const p = v.profile;
  const every: WeighEvery = p.weighEvery ?? '3x';
  const series = trendOf(v.weighIns);
  const now = series.at(-1);
  const iso = today();
  const since = rangeStart(range, iso);
  const shown = series.filter((x) => x.date >= since);
  const w = (kg: number) => Number(fromKg(kg, units.weight).toFixed(1));
  const status = p.target && now ? planStatus(p.target, now.trend, iso) : null;
  const plan = p.target ? planCurve(p.target).filter((x) => x.date >= since) : [];
  const b = now && p.height ? bmi(now.trend, p.height) : 0;
  const band = p.height ? healthyRange(p.height) : undefined;
  const change = (days: number) => { const d = trendChange(series, iso, days); return d === null ? '—' : `${d > 0 ? '+' : ''}${w(d)}`; };
  const latest = [...v.weighIns].reverse();
  const measured = (k: 'fat' | (typeof MEASURES)[number]['id']) => latest.find((x) => x[k] !== undefined);
  const photos = latest.filter((x) => x.photo && images[imgKey(p.id, `weigh-${x.id}`)]);
  const setUnits = (patch: Partial<typeof units>) => update((l) => ({ ...l, settings: { ...l.settings, units: { ...units, ...patch } } }));

  async function setHeight() {
    const t = await ask(units.length === 'cm' ? 'Height (cm)' : 'Height (e.g. 5\'11")', p.height ? fmtHeight(p.height, units.length).replace(' cm', '') : '');
    if (t === null) return;
    const cm = parseHeight(t, units.length);
    if (!cm) return notify('That doesn’t look like a height', units.length === 'cm' ? 'Try something like 175.' : 'Try something like 5\'11" or 71 (inches).');
    update((l) => putProfile(l, p.id, { height: cm }));
  }
  async function addReminder() {
    if (every === 'off') return notify('Reminders are off', 'Pick how often first.');
    try { await saveFile('iron-log-weigh-in.ics', reminderICS(every, new Date()), 'text/calendar'); }
    catch (e) { notify('Could not create the reminder', (e as Error).message); }
  }

  return (
    <Screen>
      <Header title="Me" right={<IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />} />

      <Section title="Weight" right={<Button title="Log weigh-in" icon="add" kind={weighInDue(v.weighIns, every, iso) ? 'primary' : 'secondary'} onPress={() => router.push('/weigh-in')} style={{ minHeight: 40, paddingHorizontal: space.md }} />}>
        {now ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
              <T style={{ fontFamily: mono, fontSize: font.big }}>{w(now.trend)}</T>
              <T v="small">{units.weight} trend · last weigh-in {fmtWeight(now.weight, units.weight)}, {dateWithYear(now.date)}</T>
            </View>
            {b ? <T v="small">BMI {b.toFixed(1)} · {bmiLabel(b)}</T> : null}
            {weighInDue(v.weighIns, every, iso) && <T v="small" color={c.accent}>Weigh-in due</T>}
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
              <Stat k="1 week" v={change(7)} />
              <Stat k="1 month" v={change(30)} />
              <Stat k="Weigh-ins" v={v.weighIns.length} />
            </View>
          </>
        ) : <Empty>Log your first weigh-in. Weigh at the same time of day, ideally in the morning before breakfast.</Empty>}
      </Section>

      <Section title="Target" right={<Button title={p.target ? 'Change' : 'Set target'} kind="ghost" onPress={() => router.push('/target')} style={{ minHeight: 40, paddingHorizontal: space.sm }} />}>
        {p.target ? (
          <>
            <T>{fmtWeight(p.target.weight, units.weight)} by {dateWithYear(p.target.date)}</T>
            <T v="small">
              {(() => { const r = planRate(p.target!); return `${Math.abs(r.pctPerWeek).toFixed(2)}% a week (${fmtWeight(Math.abs(r.kgPerWeek), units.weight)} a week to start)`; })()}
            </T>
            {status && <T style={{ fontWeight: '600', marginTop: 2 }} color={status.behind > 0.3 ? c.warnText : c.good}>{status.label}</T>}
          </>
        ) : <Empty>Set a target weight and date to see a planned curve against your trend.</Empty>}
      </Section>

      <Card style={{ marginBottom: space.md }}>
        <Segmented<Range> value={range} onChange={setRange} options={RANGES} />
        <TimeChart unit="" band={band ? { lo: w(band.lo), hi: w(band.hi) } : undefined} empty={`No weigh-ins in the ${rangeLabel(range).toLowerCase()}.`} series={[
          { points: shown.map((x) => ({ date: x.date, v: w(x.weight) })), style: 'dots' },
          { points: shown.map((x) => ({ date: x.date, v: w(x.trend) })), style: 'line' },
          ...(plan.length ? [{ points: plan.map((x) => ({ date: x.date, v: w(x.weight) })), style: 'dash' as const, color: c.good }] : []),
        ]} />
        <T v="small" style={{ fontSize: 12 }}>
          Dots: weigh-ins · line: trend{plan.length ? ' · dashed: plan' : ''}{band ? ' · shaded: healthy BMI' : ''} · {units.weight}
        </T>
        {v.weighIns.length > 0 && <Button title="All weigh-ins" kind="ghost" onPress={() => router.push('/weigh-ins')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />}
      </Card>

      {(measured('fat') || MEASURES.some((m) => measured(m.id))) && (
        <Section title="Measurements">
          {measured('fat') && <Row title="Body fat" subtitle={dateWithYear(measured('fat')!.date)} right={<T style={{ fontFamily: mono }}>{measured('fat')!.fat}%</T>} />}
          {MEASURES.filter((m) => measured(m.id)).map((m, i, arr) => (
            <Row key={m.id} title={m.label} subtitle={dateWithYear(measured(m.id)!.date)} last={i === arr.length - 1}
              right={<T style={{ fontFamily: mono }}>{fmtLength(measured(m.id)![m.id]!, units.length)}</T>} />
          ))}
        </Section>
      )}

      {photos.length > 0 && (
        <Section title="Progress photos">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {photos.slice(0, 6).map((x) => (
              <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={`Photo, ${dateWithYear(x.date)}`} onPress={() => router.push({ pathname: '/weigh-in', params: { id: x.id } })}>
                <Image source={{ uri: images[imgKey(p.id, `weigh-${x.id}`)] }} style={{ width: 96, height: 128, borderRadius: 10, backgroundColor: c.chip }} />
                <T v="small" style={{ fontSize: 11 }}>{dateWithYear(x.date)}</T>
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      <T v="label">Body</T>
      <Gap h={space.sm} />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={<Ionicons name="resize-outline" size={22} color={c.accent} />} title="Height" subtitle={p.height ? fmtHeight(p.height, units.length) : 'Used for BMI'}
          right={<Ionicons name="chevron-forward" size={20} color={c.muted} />} onPress={setHeight} />
        <View style={{ paddingVertical: space.sm, gap: space.sm }}>
          <T v="small">Units for body weight and measurements (lifts stay in kg)</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><Segmented value={units.weight} onChange={(weight) => setUnits({ weight })} options={[{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }]} /></View>
            <View style={{ flex: 1 }}><Segmented value={units.length} onChange={(length) => setUnits({ length })} options={[{ id: 'cm', label: 'cm' }, { id: 'in', label: 'ft / in' }]} /></View>
          </View>
        </View>
        <View style={{ paddingVertical: space.sm, gap: space.sm }}>
          <T v="small">Weigh-in reminder</T>
          <Segmented<WeighEvery> value={every} onChange={(weighEvery) => update((l) => putProfile(l, p.id, { weighEvery }))}
            options={[{ id: 'daily', label: 'Daily' }, { id: '3x', label: '3× a week' }, { id: 'weekly', label: 'Weekly' }, { id: 'off', label: 'Off' }]} />
          <T v="small" style={{ fontSize: 12 }}>Iron Log shows “Weigh-in due” on Home. To get a notification too, add a repeating reminder to your calendar.</T>
          <Button title="Add reminder to calendar" icon="calendar-outline" kind="secondary" onPress={addReminder} disabled={every === 'off'} />
        </View>
      </Card>
      <Gap />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={<Ionicons name="people-outline" size={22} color={c.accent} />} title="Profiles" subtitle={`Logging as ${p.name}`}
          right={<Ionicons name="chevron-forward" size={20} color={c.muted} />} onPress={() => router.push('/profiles')} />
        <Row left={<Ionicons name="settings-outline" size={22} color={c.accent} />} title="Settings" subtitle="Backups, rest timer, appearance, Strong import"
          right={<Ionicons name="chevron-forward" size={20} color={c.muted} />} onPress={() => router.push('/settings')} last />
      </Card>
    </Screen>
  );
}
