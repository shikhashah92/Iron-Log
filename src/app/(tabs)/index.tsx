import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLog, useTheme } from '../../store';
import { useBackup } from '../../backupActions';
import { duration, getEx, longDate, needsBackupNudge, num, plural, putProfile, recentExIds, today, weekStats, workoutStats } from '../../model';
import { AddButton, Empty, ExRow, Section, Stat } from '../../components';
import { Banner, BrandMark, Button, Card, Field, Gap, Screen, selectAll, T } from '../../ui';
import { condensed, mono, space } from '../../theme';
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
            <T style={{ fontFamily: condensed, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>{v.profile.name}</T>
          </Pressable>
        </View>

        {saveError ? <><Banner tone="error" text={saveError} action="Back up" onPress={backup.exportPlain} /><Gap h={space.md} /></> : null}
        <Section title="Today" right={<T v="mono" style={{ fontSize: 12 }}>{longDate(iso)}</T>}>
          {live && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Resume ${live.name}`} onPress={openWorkout}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 }}>
              <T style={{ flex: 1, fontFamily: condensed, fontWeight: '600', fontSize: 17 }} color={c.accent}>● {live.name}</T>
              <T v="mono" style={{ fontSize: 12 }}>in progress · {duration(now - live.startedAt)}</T>
            </Pressable>
          )}
          {todays.map((w) => {
            const { sets, volume } = workoutStats(v, w);
            return (
              <View key={w.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.border }}>
                <T numberOfLines={1} style={{ flex: 1, fontFamily: condensed, fontWeight: '600', fontSize: 17 }}>{w.name}</T>
                <T v="mono" style={{ fontSize: 12 }}>{[w.endedAt ? duration(w.endedAt - w.startedAt) : '', plural(sets, 'set'), `${num(volume)} kg`].filter(Boolean).join(' · ')}</T>
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

        {v.entries.length ? (
          <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
            <Stat k="This week" v={<>{week.sessions}<T v="mono"> sess</T></>} />
            <Stat k="Sets" v={week.sets} />
            <Stat k="Volume" v={week.volume >= 1000 ? `${num(week.volume / 1000)}t` : num(week.volume)} />
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

        <Bodyweight key={v.profile.id} />
      </Screen>
      <AddButton label={live ? 'Resume workout' : 'Start a workout'} onPress={openWorkout} />
      {backup.modal}
    </View>
  );
}

/** Each person's bodyweight, for volume and 1RM on bodyweight exercises. Keyed by profile so switching resets it. */
function Bodyweight() {
  const { v, update } = useLog();
  const [bw, setBw] = useState(v.profile.bodyweight ? String(v.profile.bodyweight) : '');
  const save = () => {
    const n = parseFloat(bw.replace(',', '.'));
    update((l) => putProfile(l, v.profile.id, { bodyweight: Number.isFinite(n) && n > 0 && n < 500 ? n : 0 }));
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <T v="small" style={{ flex: 1 }}>Bodyweight, for volume and 1RM estimates on bodyweight exercises</T>
        <Field value={bw} onChangeText={setBw} onBlur={save} onSubmitEditing={save} placeholder="kg" inputMode="decimal"
          accessibilityLabel="Bodyweight in kg" onFocus={selectAll} style={{ width: 88, textAlign: 'center', fontFamily: mono }} />
      </View>
    </Card>
  );
}
