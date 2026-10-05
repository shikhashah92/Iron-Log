import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLog, useTheme } from '../../store';
import { useBackup } from '../../backupActions';
import { duration, fmtDur, fmtKg, fmtVolume, putProfile, putWorkout, startWorkout, upNext, viewOf, getEx, longDate, needsBackupNudge, plural, recentExIds, today, weekRecap, weekStart, weekStats, workoutStats } from '../../model';
import { fmtWeight, planStatus, trendOf, weighInDue } from '../../body';
import { workoutCalories } from '../../calories';
import { AddButton, Empty, ExRow, InstallNudge, Ring, Section, Stat } from '../../components';
import { challengeNum, challengeProgress, challengeUnit, daysOff, easeBack, goalStreak, monthName, pastYou, prevMonth, weekProgress, wrapped } from '../../fun';
import { menu } from '../../io';
import { Banner, BrandMark, Button, Card, Gap, Screen, T } from '../../ui';
import { radius, sans, space } from '../../theme';
import { useNow } from '../../timer';

export default function Home() {
  const { log, v, saveError } = useLog();
  const { c } = useTheme();
  const backup = useBackup();
  const iso = today();
  const week = weekStats(v, iso);
  const todays = v.workouts.filter((w) => w.date === iso && !w.active).reverse();
  const live = v.active;
  const now = useNow(!!live);
  const openWorkout = () => (live ? router.push('/active') : router.navigate('/workout'));
  const favIds = v.favorites.map((f) => f.exerciseId);
  const recent = recentExIds(v).slice(0, 6);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.lg, paddingBottom: space.md }}>
          <BrandMark />
          <Pressable accessibilityRole="button" accessibilityLabel={`Profile: ${v.profile.name}. Switch`} onPress={() => router.push('/profiles')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: space.md, borderRadius: 999, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="person-circle-outline" size={20} color={c.accent} />
            <T style={{ fontWeight: '600' }} numberOfLines={1}>{v.profile.name}</T>
          </Pressable>
        </View>

        <InstallNudge />
        {saveError ? <><Banner tone="error" text={saveError} action="Back up" onPress={backup.exportPlain} /><Gap h={space.md} /></> : null}
        <Section title="Today" right={<T v="mono" style={{ fontSize: 12 }}>{longDate(iso)}</T>}>
          {live && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Resume ${live.name}`} onPress={openWorkout}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 }}>
              <T style={{ flex: 1, fontFamily: sans, fontWeight: '600', fontSize: 17 }} color={c.accent}>● {live.name}</T>
              <T v="mono" style={{ fontSize: 12 }}>in progress · {duration(now - live.startedAt)}</T>
            </Pressable>
          )}
          {todays.map((w) => {
            const { sets, volume } = workoutStats(v, w);
            return (
              <View key={w.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.border }}>
                <T numberOfLines={1} style={{ flex: 1, fontFamily: sans, fontWeight: '600', fontSize: 17 }}>{w.name}</T>
                <T v="mono" style={{ fontSize: 12 }}>{[w.endedAt ? duration(w.endedAt - w.startedAt) : '', plural(sets, 'set'), volume ? fmtVolume(volume, v.unit) : '', (() => { const k = workoutCalories(v, w); return k ? `≈${k} kcal` : ''; })()].filter(Boolean).join(' · ')}</T>
              </View>
            );
          })}
          {!live && !todays.length && <Empty>No workout yet today.</Empty>}
          <Gap h={space.sm} />
          <Button title={live ? 'Resume workout' : todays.length ? 'Start another workout' : 'Start a workout'} onPress={openWorkout} />
        </Section>

        {/* Backups: a quiet nudge once there's something worth losing, never before. */}
        {!log.settings.backupChoice && log.workouts.some((w) => !w.active) ? (
          <Card style={{ marginBottom: space.md, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={c.accent} />
              <T v="small" style={{ flex: 1, color: c.text }}>Your workouts live only on this phone. Save a locked backup somewhere safe.</T>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' }}>
              <Button title="Device only" kind="ghost" onPress={backup.chooseLocal} style={{ minHeight: 40, paddingHorizontal: space.md }} />
              <Button title="Save backup" kind="secondary" onPress={backup.exportLocked} style={{ minHeight: 40, paddingHorizontal: space.md }} />
            </View>
          </Card>
        ) : needsBackupNudge(log) ? (
          <><Banner text="It’s been a week since your last backup." action="Back up" onPress={backup.exportLocked} /><Gap h={space.md} /></>
        ) : null}

        <WelcomeBack />
        <GoalCard />
        <WrappedCard />
        <PastYou />
        <ChallengeCard />
        <Recap />

        {v.entries.length ? (
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
            <Stat k="This week" v={<>{week.sessions}<T v="mono"> sess</T></>} />
            <Stat k="Sets" v={week.sets} />
            <Stat k="Volume" v={fmtVolume(week.volume, v.unit, '')} />
          </View>
        ) : null}

        <Section title="★ Favorites" pad={false}>
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            {favIds.length ? favIds.map((id, i) => <ExRow key={id} ex={getEx(v, id)} star={false} last={i === favIds.length - 1} />)
              : <Empty>Tap the star on any exercise to pin the ones you use most here.</Empty>}
          </View>
        </Section>

        {recent.length ? (
          <Section title="Recently used" pad={false}>
            <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
              {recent.map((id, i) => <ExRow key={id} ex={getEx(v, id)} last={i === recent.length - 1} />)}
            </View>
          </Section>
        ) : null}

        <WeightCard />
      </Screen>
      <AddButton label={live ? 'Resume workout' : 'Start a workout'} onPress={openWorkout} />
      {backup.modal}
    </View>
  );
}

/** The latest trend, and a nudge when a weigh-in is due (the Me tab has the rest). */
function WeightCard() {
  const { log, v } = useLog();
  const { c } = useTheme();
  const units = log.settings.units ?? { weight: 'kg', length: 'cm' };
  const now = trendOf(v.weighIns).at(-1);
  const due = weighInDue(v.weighIns, v.profile.weighEvery ?? '3x', today());
  const status = v.profile.target && now ? planStatus(v.profile.target, now.trend, today()).label : '';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={due ? 'Weigh-in due. Log it' : 'Weight'} onPress={() => router.push(due ? '/weigh-in' : '/me')}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, borderColor: due ? c.accent : c.border }}>
        <Ionicons name="scale-outline" size={24} color={c.accent} />
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '600' }}>{now ? `${fmtWeight(now.trend, units.weight)} trend` : 'Log your weight'}</T>
          <T v="small">{due ? 'Weigh-in due' : status || 'See your trend in Me'}</T>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.muted} />
      </Card>
    </Pressable>
  );
}

/** Monday to Wednesday: last week in one card, with the group that was light and a template for it. Close it for the week. */
function Recap() {
  const { log, v, update } = useLog();
  const { c } = useTheme();
  const iso = today();
  const monday = weekStart(iso);
  if (new Date(`${iso}T12:00:00`).getDay() > 3 || new Date(`${iso}T12:00:00`).getDay() === 0 || log.settings.recapSeen === monday) return null;
  const r = weekRecap(v, iso);
  if (!r) return null;
  const diff = r.last.workouts - r.before.workouts;
  const tpl = r.light && v.templates.find((t) => t.id === `starter-${r.light!.group.toLowerCase()}`);
  const close = () => update((l) => ({ ...l, settings: { ...l.settings, recapSeen: monday } }));
  return (
    <Card style={{ marginBottom: space.md, gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Ionicons name="calendar-outline" size={20} color={c.accent} />
        <T style={{ flex: 1, fontFamily: sans, fontWeight: '700', fontSize: 18 }}>Last week</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Hide last week’s recap" onPress={close} hitSlop={10}>
          <Ionicons name="close" size={20} color={c.muted} />
        </Pressable>
      </View>
      <T style={{ fontSize: 17 }}>
        {plural(r.last.workouts, 'workout')}{r.last.minutes ? ` · ${fmtDur(r.last.minutes * 60)}` : ''}{r.last.volume ? ` · ${fmtVolume(r.last.volume, v.unit, '')}` : ''}
      </T>
      <T v="small">{!r.last.workouts ? 'A week off. This one’s a fresh start.' : diff > 0 ? `${plural(diff, 'more workout')} than the week before. Nice.` : diff < 0 ? `${plural(-diff, 'fewer workout')} than the week before.` : 'Same as the week before: steady.'}</T>
      {r.light && (
        <View style={{ backgroundColor: c.accentSoft, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
          <T style={{ color: c.text }}><T style={{ fontWeight: '700' }}>{r.light.group} {r.light.group === 'Core' ? 'was' : 'were'} light:</T> {plural(r.light.sets, 'set')}, when you usually do about {r.light.usual}.</T>
          {tpl && <Button title={`Try the ${tpl.name} template`} icon="arrow-forward" kind="secondary" onPress={() => router.push({ pathname: '/template', params: { id: tpl.id } })} style={{ minHeight: 40 }} />}
        </View>
      )}
    </Card>
  );
}

const GOAL_CHOICES = [2, 3, 4, 5, 6];
/** The weekly goal: a ring that fills with each workout this week. First, one question: how many a week? */
function GoalCard() {
  const { v, update } = useLog();
  const { c } = useTheme();
  const goal = v.profile.weeklyGoal;
  const set = (n: number) => update((l) => putProfile(l, v.profile.id, { weeklyGoal: n }));
  if (!goal) {
    return (
      <Card style={{ marginBottom: space.md, gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="radio-button-on-outline" size={20} color={c.accent} />
          <T style={{ flex: 1, fontFamily: sans, fontWeight: '700', fontSize: 18 }}>Set a weekly goal</T>
        </View>
        <T v="small">How many workouts a week? A ring fills as you go, and rest days never break anything.</T>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {GOAL_CHOICES.map((n) => (
            <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} workouts a week`} onPress={() => set(n)}
              style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.brand : c.chip })}>
              <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 20 }}>{n}</T>
            </Pressable>
          ))}
        </View>
        <T v="small" center style={{ fontSize: 12 }}>workouts a week · 3 is a great start</T>
      </Card>
    );
  }
  const iso = today();
  const p = weekProgress(v, iso, goal);
  const streak = goalStreak(v, iso, goal);
  async function change() {
    const pick = await menu('Workouts a week', GOAL_CHOICES.map((n) => ({ label: `${n}${n === goal ? ' (now)' : ''}` })));
    if (pick !== null) set(GOAL_CHOICES[pick]);
  }
  return (
    <Card style={{ marginBottom: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Ring done={p.done} goal={goal} />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 19 }}>{p.met ? (p.done > goal ? `Goal smashed: ${p.done} this week` : 'Weekly goal met') : `${plural(p.left, 'workout')} to go`}</T>
        <T v="small">{p.met ? 'Everything from here is a bonus.' : p.daysLeft ? `${plural(p.daysLeft + 1, 'day')} left this week, today included.` : 'Last day of the week: today counts.'}</T>
        {streak > 1 ? <T v="small" style={{ fontWeight: '700' }} color={c.accent}>{streak} weeks in a row</T> : null}
        {!v.profile.trainDays ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/training')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="calendar-outline" size={14} color={c.accent} />
            <T v="small" style={{ fontWeight: '700' }} color={c.accent}>Remind me on my training days</T>
          </Pressable>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Weekly goal: ${goal}. Change`} onPress={change} hitSlop={10}>
        <T v="small" style={{ fontWeight: '700' }} color={c.accent}>Goal {goal}</T>
      </Pressable>
    </Card>
  );
}

/** After 10 days or more off: no guilt, just an easy way back in (the usual workout, lighter). */
function WelcomeBack() {
  const { v, update } = useLog();
  const { c } = useTheme();
  const iso = today();
  const off = daysOff(v, iso);
  if (v.active || off === null || off < 10) return null;
  const n = upNext(v, iso);
  const t = v.workouts.find((w) => !w.active && w.templateId)?.templateId ?? n.templateId;
  const tpl = v.templates.find((x) => x.id === t);
  if (!tpl) return null;
  function ease() {
    update((l) => { const s = startWorkout(l, tpl!.id); const a = viewOf(s).active; return a ? putWorkout(s, easeBack(a, 0.8, viewOf(s).unit)) : s; });
    router.push('/active');
  }
  return (
    <Card style={{ marginBottom: space.md, gap: space.sm, borderColor: c.accent }}>
      <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 20 }}>Welcome back, {v.profile.name.split(' ')[0]}</T>
      <T v="small" style={{ color: c.text }}>It’s been {off} days. Breaks happen: the best workout is the one you start. Ease back in with {tpl.name} at about 80% of your usual weights.</T>
      <Button title={`Ease back in: ${tpl.name}`} icon="play" onPress={ease} />
    </Card>
  );
}

/** The first week of a month: last month, wrapped, one tap away. */
function WrappedCard() {
  const { log, v, update } = useLog();
  const { c } = useTheme();
  const iso = today();
  const month = prevMonth(iso.slice(0, 7));
  if (Number(iso.slice(8)) > 7 || log.settings.wrappedSeen === month) return null;
  const r = wrapped(v, month);
  if (!r) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${monthName(month)}, wrapped: ${plural(r.workouts, 'workout')}. Open`} onPress={() => router.push({ pathname: '/wrapped', params: { month } })}>
      <View style={{ backgroundColor: c.onAccent, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space.lg, marginBottom: space.md, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T style={{ flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 1 }} color={c.brand}>{monthName(month).toUpperCase()}, WRAPPED</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Hide" hitSlop={10} onPress={() => update((l) => ({ ...l, settings: { ...l.settings, wrappedSeen: month } }))}>
            <Ionicons name="close" size={18} color="#9AA0A6" />
          </Pressable>
        </View>
        <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 26 }} color="#F7F7F5">{plural(r.workouts, 'workout')}{r.bests ? `, ${plural(r.bests, 'personal best')}` : ''}</T>
        <T v="small" color="#9AA0A6">See your month and share it →</T>
      </View>
    </Pressable>
  );
}

/** "Three months ago your best squat was 60 kg. Now: 85 kg." Only when you've clearly got stronger. */
function PastYou() {
  const { v } = useLog();
  const { c } = useTheme();
  const p = pastYou(v, today());
  if (!p) return null;
  return (
    <Card style={{ marginBottom: space.md, flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="time-outline" size={22} color={c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="label" style={{ fontSize: 11 }}>Past you</T>
        <T style={{ color: c.text }}>{p.label}, your best {getEx(v, p.exerciseId).name} was {fmtKg(p.was, v.unit)}. Now it’s <T style={{ fontWeight: '800' }}>{fmtKg(p.now, v.unit)}</T>.</T>
      </View>
    </Card>
  );
}

/** Challenges you're in (the ones still running), with a bar each. */
function ChallengeCard() {
  const { v } = useLog();
  const { c } = useTheme();
  const iso = today();
  const live = (v.profile.challenges ?? []).map((j) => challengeProgress(v, j, iso)).filter((p): p is NonNullable<typeof p> => !!p && !p.completedOn && !p.over);
  if (!live.length) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Your challenges" onPress={() => router.push('/challenges')}>
      <Card style={{ marginBottom: space.md, gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="flag-outline" size={20} color={c.accent} />
          <T style={{ flex: 1, fontFamily: sans, fontWeight: '700', fontSize: 18 }}>{live.length === 1 ? 'Your challenge' : 'Your challenges'}</T>
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        </View>
        {live.slice(0, 2).map((p) => (
          <View key={p.def.name} style={{ gap: 4 }}>
            <T numberOfLines={1} style={{ fontWeight: '600' }}>{p.def.name}</T>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.chip, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(1, p.done / p.target) * 100}%`, height: '100%', backgroundColor: c.brand, borderRadius: 4 }} />
            </View>
            <T v="small">{challengeNum(p.def, v, p.done)} of {challengeNum(p.def, v, p.target)} {challengeUnit(p.def, v)} · {plural(p.daysLeft + 1, 'day')} left</T>
          </View>
        ))}
      </Card>
    </Pressable>
  );
}
