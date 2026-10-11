import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  bmi, bmiLabel, fmtLength, fmtWeight, fromKg, healthyRange, planCurve, planRate, planStatus, trendChange, trendOf, weighInDue, type WeighEvery,
} from '../../body';
import { addDays, ageOn, backupDue, dateWithYear, dayKey, daysAgo, GENDERS, GOALS, imgKey, MEASURES, plural, today } from '../../model';
import { useBackup } from '../../backupActions';
import { useLog, useTheme } from '../../store';
import { notify } from '../../io';
import { Empty, RANGES, rangeLabel, rangeStart, Section, Stat, TimeChart, type Range } from '../../components';
import { milestonesOf } from '../../fun';
import { Banner, Button, Card, Gap, Header, IconButton, Row, Screen, Segmented, T } from '../../ui';
import { font, sans, space } from '../../theme';

/** You: weight, its trend and your target, body measurements, and settings. */
export default function Me() {
  const { log, v, images } = useLog();
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
  // The plan runs ahead of today: all the way to the target in All, a quarter of the window ahead in 3M / 1Y.
  const ahead = range === 'all' ? '9999-12-31' : addDays(iso, range === '3m' ? 23 : 91);
  const plan = p.target ? planCurve(p.target).filter((x) => x.date >= since && x.date <= ahead) : [];
  const b = now && p.height ? bmi(now.trend, p.height) : 0;
  const band = p.height ? healthyRange(p.height) : undefined;
  const change = (days: number) => { const d = trendChange(series, iso, days); return d === null ? '—' : `${d > 0 ? '+' : ''}${w(d)}`; };
  const latest = [...v.weighIns].reverse();
  const measured = (k: 'fat' | (typeof MEASURES)[number]['id']) => latest.find((x) => x[k] !== undefined);
  const photos = latest.filter((x) => x.photo && images[imgKey(p.id, `weigh-${x.id}`)]);

  const due = v.weighIns.length > 0 && weighInDue(v.weighIns, every, iso);
  const chevron = <Ionicons name="chevron-forward" size={20} color={c.muted} />;
  const icon = (name: keyof typeof Ionicons.glyphMap) => <Ionicons name={name} size={22} color={c.accent} />;
  const { earned, upcoming } = milestonesOf(v, p.weeklyGoal ?? 0);
  const nextTrophy = [...upcoming].sort((x, y) => y.progress / y.at - x.progress / x.at)[0];
  const joined = (p.challenges ?? []).length;
  const lastFat = measured('fat'), lastMeasure = MEASURES.find((m) => measured(m.id));

  return (
    <Screen>
      <Header title="Me" right={<IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />} />
      <BackupDue />
      {/* Who's logging: details on tap, and the profile switcher. */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${p.name}: about you`} onPress={() => router.push('/about')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 18 }} color={c.accent}>{p.name.slice(0, 1).toUpperCase()}</T>
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '600', fontSize: 17 }}>{p.name}</T>
            <T v="small">{[p.dob && `${ageOn(p.dob, iso)} years`, GENDERS.find((g) => g.id === p.gender)?.label, GOALS.find((g) => g.id === p.goal)?.label].filter(Boolean).join(' · ') || 'Add your details'}</T>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch profile" hitSlop={8} onPress={() => router.push('/profiles')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <T v="small" style={{ fontWeight: '600' }} color={c.accent}>Switch</T>
          <Ionicons name="chevron-down" size={14} color={c.accent} />
        </Pressable>
      </Card>

      <Section title="Weight" right={due ? <T v="small" style={{ fontWeight: '600', backgroundColor: c.accentSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }} color={c.accent}>Weigh-in due</T> : undefined}>
        {now ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
              <T style={{ fontFamily: sans, fontSize: font.big }}>{w(now.trend)}</T>
              <T v="small" style={{ flexShrink: 1 }}>{units.weight} trend{b ? ` · BMI ${b.toFixed(1)} (${bmiLabel(b).toLowerCase()})` : ''}</T>
              <IconButton icon="information-circle-outline" size={18} label="What is the trend?" color={c.accent} onPress={() => notify('Why the trend, not your last weigh-in',
                `Your weight swings ${units.weight === 'kg' ? '1–2 kg' : '2–4 lb'} from day to day on water and food alone, so one weigh-in can mislead. `
                + `The trend is a running average: each weigh-in moves it 10% of the way towards the new number (more if days have passed).\n\n`
                + `Your last weigh-in was ${fmtWeight(now.weight, units.weight)} on ${dateWithYear(now.date)}, and the trend moved towards it, to ${fmtWeight(now.trend, units.weight)}. `
                + 'If the new weight is real, the trend keeps heading there over the next week or two. If it was a one-off, it barely moves.\n\n'
                + 'Your target, BMI and the 1 week / 1 month changes all use the trend.')} />
            </View>
            <Gap h={space.sm} />
            <Segmented<Range> value={range} onChange={setRange} options={RANGES} />
            <TimeChart unit={` ${units.weight}`} band={band ? { lo: w(band.lo), hi: w(band.hi) } : undefined} empty={`No weigh-ins in the ${rangeLabel(range).toLowerCase()}.`} series={[
              { points: shown.map((x) => ({ date: x.date, v: w(x.weight) })), style: 'dots', label: 'Weigh-in' },
              { points: shown.map((x) => ({ date: x.date, v: w(x.trend) })), style: 'line', label: 'Trend' },
              ...(plan.length ? [{ points: plan.map((x) => ({ date: x.date, v: w(x.weight) })), style: 'dash' as const, color: c.good, label: 'Plan' }] : []),
            ]} />
            <T v="small" style={{ fontSize: 12 }}>Dots: weigh-ins · line: trend{plan.length ? ' · dashed: plan' : ''}{band ? ' · shaded: healthy BMI' : ''}</T>
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
              <Stat k="1 week" v={change(7)} />
              <Stat k="1 month" v={change(30)} />
            </View>
          </>
        ) : <Empty>Log your first weigh-in. Weigh at the same time of day, ideally in the morning before breakfast.</Empty>}
        <Button title="Log weigh-in" icon="add" kind={due || !now ? 'primary' : 'secondary'} onPress={() => router.push('/weigh-in')} style={{ marginTop: space.md }} />
        {v.weighIns.length > 0 && <Button title={`All weigh-ins (${v.weighIns.length})`} kind="ghost" onPress={() => router.push('/weigh-ins')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, minHeight: 40 }} />}
      </Section>

      <Card pad={false} style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
        <Row left={icon('flag-outline')} title={p.target ? `${fmtWeight(p.target.weight, units.weight)} by ${dateWithYear(p.target.date)}` : 'Set a target'} right={chevron} onPress={() => router.push('/target')} last
          subtitle={p.target ? (status?.label ?? (() => { const r = planRate(p.target!); return `${Math.abs(r.pctPerWeek).toFixed(2)}% a week`; })()) : 'A target weight and date, planned against your trend'} />
      </Card>

      {(lastFat || lastMeasure) && (
        <Section title="Measurements">
          {lastFat && <Row title="Body fat" subtitle={dateWithYear(lastFat.date)} right={<T style={{ fontFamily: sans }}>{lastFat.fat}%</T>} />}
          {MEASURES.filter((m) => measured(m.id)).map((m, i, arr) => (
            <Row key={m.id} title={m.label} subtitle={dateWithYear(measured(m.id)!.date)} last={i === arr.length - 1}
              right={<T style={{ fontFamily: sans }}>{fmtLength(measured(m.id)![m.id]!, units.length)}</T>} />
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

      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={icon('trophy-outline')} title="Trophies" right={chevron} onPress={() => router.push('/trophies')}
          subtitle={[`${earned.length} earned`, nextTrophy && `next: ${nextTrophy.title}`].filter(Boolean).join(' · ')} />
        <Row left={icon('people-outline')} title="Challenges" right={chevron} onPress={() => router.push('/challenges')} last
          subtitle={joined ? `${plural(joined, 'challenge')} joined` : 'Solo challenges, or dare a friend'} />
      </Card>
    </Screen>
  );
}

/** Why Me has a dot on it: a backup is due. One tap saves a locked one. */
function BackupDue() {
  const { log } = useLog();
  const backup = useBackup();
  if (!backupDue(log)) return null;
  const days = log.settings.lastBackupAt ? daysAgo(dayKey(new Date(log.settings.lastBackupAt)), today()) : null;
  return (
    <>
      <Banner text={days === null ? 'You haven’t saved a backup yet. If this phone is lost, so are your workouts.' : `Your last backup was ${plural(days, 'day')} ago.`} action="Back up" onPress={backup.exportLocked} />
      {backup.modal}
      <Gap h={space.md} />
    </>
  );
}
