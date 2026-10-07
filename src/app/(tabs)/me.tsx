import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  bmi, bmiLabel, fmtHeight, fmtLength, fmtWeight, fromKg, healthyRange, googleCalendarURL, planCurve, planRate, planStatus, reminderFile, reminderICS, reminderStart,
  trendChange, trendOf, weighInDue, type WeighEvery,
} from '../../body';
import { ageOn, backupDue, dateWithYear, dayKey, daysAgo, GENDERS, GOALS, imgKey, MEASURES, plural, putProfile, today, withUnits } from '../../model';
import { useBackup } from '../../backupActions';
import { useLog, useTheme } from '../../store';
import { notify, saveFile } from '../../io';
import { BASE, isAndroid, isIOS } from '../../pwa';
import { Empty, MilestoneCard, RANGES, rangeLabel, rangeStart, Section, Stat, TimeChart, type Range } from '../../components';
import { milestonesOf, progressLabel } from '../../fun';
import { Banner, Button, Card, Gap, Header, IconButton, Row, Screen, Segmented, T } from '../../ui';
import { font, sans, space } from '../../theme';

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
  const setUnits = (patch: Partial<typeof units>) => update((l) => withUnits(l, { ...units, ...patch }));

  async function addReminder() {
    if (every === 'off') return notify('Reminders are off', 'Pick how often first.');
    // iPhone: Safari opens a hosted .ics as "Add to Calendar". Android: Google Calendar, pre-filled. Elsewhere: a file.
    const start = reminderStart(every, new Date());
    if (isIOS()) {
      // The app's own service worker answers this on the phone (starting today); see public/sw.js.
      const url = new URL(`${BASE}${reminderFile(every)}?day=${dayKey(start).replace(/-/g, '')}`, location.origin).href;
      location.href = url; // in Safari and in the Home Screen app alike (window.open there shows a blank sheet)
      return;
    }
    if (isAndroid()) return void window.open(googleCalendarURL(every, start), '_blank');
    try { await saveFile('uplift-weigh-in.ics', reminderICS(every, start), 'text/calendar'); }
    catch (e) { notify('Could not create the reminder', (e as Error).message); }
  }

  return (
    <Screen>
      <Header title="Me" right={<IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />} />
      <BackupDue />
      <TrophyShelf />
      <Card pad={false} style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
        <Row left={<Ionicons name="flag-outline" size={22} color={c.accent} />} title="Challenges" last right={<Ionicons name="chevron-forward" size={20} color={c.muted} />}
          subtitle={(v.profile.challenges ?? []).length ? `${plural((v.profile.challenges ?? []).length, 'challenge')} joined` : 'Solo challenges, or dare a friend'} onPress={() => router.push('/challenges')} />
      </Card>

      <Section title="Weight" right={<Button title="Log weigh-in" icon="add" kind={weighInDue(v.weighIns, every, iso) ? 'primary' : 'secondary'} onPress={() => router.push('/weigh-in')} style={{ minHeight: 40, paddingHorizontal: space.md }} />}>
        {now ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
              <T style={{ fontFamily: sans, fontSize: font.big }}>{w(now.trend)}</T>
              <T v="small" style={{ flexShrink: 1 }}>{units.weight} trend · last weigh-in {fmtWeight(now.weight, units.weight)}, {dateWithYear(now.date)}</T>
              <IconButton icon="information-circle-outline" size={18} label="What is the trend?" color={c.accent} onPress={() => notify('Why the trend, not your last weigh-in',
                `Your weight swings ${units.weight === 'kg' ? '1–2 kg' : '2–4 lb'} from day to day on water and food alone, so one weigh-in can mislead. `
                + `The trend is a running average: each weigh-in moves it 10% of the way towards the new number (more if days have passed).\n\n`
                + `Your last weigh-in was ${fmtWeight(now.weight, units.weight)}, and the trend moved towards it, to ${fmtWeight(now.trend, units.weight)}. `
                + 'If the new weight is real, the trend keeps heading there over the next week or two. If it was a one-off, it barely moves.\n\n'
                + 'Your target, BMI and the 1 week / 1 month changes all use the trend.')} />
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
          {measured('fat') && <Row title="Body fat" subtitle={dateWithYear(measured('fat')!.date)} right={<T style={{ fontFamily: sans }}>{measured('fat')!.fat}%</T>} />}
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

      <T v="label">Body</T>
      <Gap h={space.sm} />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={<Ionicons name="resize-outline" size={22} color={c.accent} />} title="Height" subtitle={p.height ? fmtHeight(p.height, units.length) : 'Used for BMI'}
          right={<Ionicons name="chevron-forward" size={20} color={c.muted} />} onPress={() => router.push('/about')} />
        <View style={{ paddingVertical: space.sm, gap: space.sm }}>
          <T v="small">Units, everywhere in the app (lifts, plates, body weight)</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><Segmented value={units.weight} onChange={(weight) => setUnits({ weight })} options={[{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }]} /></View>
            <View style={{ flex: 1 }}><Segmented value={units.length} onChange={(length) => setUnits({ length })} options={[{ id: 'cm', label: 'cm' }, { id: 'in', label: 'ft / in' }]} /></View>
          </View>
        </View>
        <View style={{ paddingVertical: space.sm, gap: space.sm }}>
          <T v="small">Weigh-in reminder</T>
          <Segmented<WeighEvery> value={every} onChange={(weighEvery) => update((l) => putProfile(l, p.id, { weighEvery }))}
            options={[{ id: 'daily', label: 'Daily' }, { id: '3x', label: '3×/week' }, { id: 'weekly', label: 'Weekly' }, { id: 'off', label: 'Off' }]} />
          <T v="small" style={{ fontSize: 12 }}>Uplift shows “Weigh-in due” on Home. To get a notification too, add a repeating reminder to your calendar.</T>
          <Button title="Add reminder to calendar" icon="calendar-outline" kind="secondary" onPress={addReminder} disabled={every === 'off'} />
        </View>
      </Card>
      <Gap />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={<Ionicons name="person-outline" size={22} color={c.accent} />} title="About you"
          subtitle={[p.dob && `${ageOn(p.dob, iso)} years`, GENDERS.find((g) => g.id === p.gender)?.label, GOALS.find((g) => g.id === p.goal)?.label].filter(Boolean).join(' · ') || 'Name, date of birth, gender, goal'}
          right={<Ionicons name="chevron-forward" size={20} color={c.muted} />} onPress={() => router.push('/about')} />
        <Row left={<Ionicons name="people-outline" size={22} color={c.accent} />} title="Profiles" subtitle={`Logging as ${p.name}`}
          right={<Ionicons name="chevron-forward" size={20} color={c.muted} />} onPress={() => router.push('/profiles')} />
        <Row left={<Ionicons name="settings-outline" size={22} color={c.accent} />} title="Settings" subtitle="Backups, rest timer, appearance, Strong import"
          right={<Ionicons name="chevron-forward" size={20} color={c.muted} />} onPress={() => router.push('/settings')} last />
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

/** The latest trophies and the closest next ones; "See all" for the whole shelf. */
function TrophyShelf() {
  const { v } = useLog();
  const { earned, upcoming } = milestonesOf(v, v.profile.weeklyGoal ?? 0);
  if (!earned.length && !v.workouts.some((w) => !w.active)) return null;
  const next = [...upcoming].sort((a, b) => b.progress / b.at - a.progress / a.at).slice(0, 2);
  return (
    <Section title={`Trophies · ${earned.length}`} right={<Button title="See all" kind="ghost" onPress={() => router.push('/trophies')} style={{ minHeight: 36, paddingHorizontal: space.sm }} />}>
      {[...earned].reverse().slice(0, 3).map((e) => <MilestoneCard key={e.id} icon={e.icon} title={e.title} detail={e.detail} sub={dateWithYear(e.date)} />)}
      {next.map((u) => <MilestoneCard key={u.id} icon={u.icon} title={u.title} detail={u.detail} sub={progressLabel(u, v.unit)} locked />)}
    </Section>
  );
}
