import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { duration, FEELINGS, fmtVolume, recordsOf, weekStart, workoutStats } from '../model';
import { challengeProgress, newMilestones } from '../fun';
import { Confetti, MilestoneCard, Records, Ring, ShareWorkout, Stat } from '../components';
import { useLog, useTheme } from '../store';
import { useEditWorkout } from '../workout';
import { Button, Gap, Header, IconButton, Screen, T } from '../ui';
import { radius, sans, space } from '../theme';

const ICONS = { Easy: 'leaf-outline', Moderate: 'pulse-outline', Hard: 'flame-outline', 'Max effort': 'flash-outline' } as const;

/** After Finish: any new personal bests and a picture to share, then how did it feel? (optional; helps spot overreaching or coasting). */
export default function Feeling() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const edit = useEditWorkout(id);
  const { v } = useLog();
  const { c } = useTheme();
  const w = v.workouts.find((x) => x.id === id && !x.active);
  const goal = v.profile.weeklyGoal ?? 0;
  const ms = w ? newMilestones(v, w, goal) : [];
  // This workout closed the ring: it's the goal-th of its week.
  const nth = w ? v.workouts.filter((x) => !x.active && weekStart(x.date) === weekStart(w.date) && x.startedAt <= w.startedAt).length : 0;
  const closed = !!goal && nth === goal;
  // Challenges this workout finished off.
  const won = w ? (v.profile.challenges ?? []).map((j) => challengeProgress(v, j, w.date)).filter((p) => p?.completedOn === w.date).map((p) => p!.def.name) : [];
  const party = !!w && (closed || ms.length > 0 || won.length > 0 || recordsOf(v, w).length > 0);
  // Done: land on History, where the workout just saved sits on top.
  const close = () => router.dismissTo('/history');
  // Tapping a feeling saves it (tap again to clear); Done closes.
  const pick = (feeling: string) => edit((x) => { const { feeling: _f, ...rest } = x; return x.feeling === feeling ? rest : { ...rest, feeling }; });
  const stats = w ? workoutStats(v, w) : null;
  // Against the last time you did this workout (same template, or the same name).
  const before = w ? v.workouts.find((x) => !x.active && x.id !== w.id && x.startedAt < w.startedAt && (w.templateId ? x.templateId === w.templateId : x.name === w.name)) : undefined;
  const prevVol = before ? workoutStats(v, before).volume : 0;
  const change = stats && prevVol && stats.volume ? Math.round(((stats.volume - prevVol) / prevVol) * 100) : null;
  return (
    <View style={{ flex: 1 }}>
    <Screen edges={['top', 'bottom']}>
      <Header title="Nice work" right={<IconButton icon="close" label="Close" onPress={close} />} />
      {w && stats && (
        <>
          <View style={{ backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: space.md, gap: space.sm, marginBottom: space.md }}>
            <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 18 }}>{[w.name, w.endedAt ? duration(w.endedAt - w.startedAt) : ''].filter(Boolean).join(' · ')}</T>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Stat k="Sets" v={stats.sets} />
              {stats.volume ? <Stat k="Volume" v={fmtVolume(stats.volume, v.unit)} /> : null}
              {change !== null ? <Stat k="vs last time" v={`${change > 0 ? '+' : ''}${change}%`} /> : null}
            </View>
          </View>
          {goal > 0 && !closed && <T v="small" style={{ marginBottom: space.sm, color: c.text }}>{nth} of {goal} this week · {Math.max(0, goal - nth)} to go</T>}
          {closed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm }}>
              <Ring done={goal} goal={goal} size={56} />
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 18 }}>Weekly goal met</T>
                <T v="small">{goal} of {goal} this week. Everything else is a bonus.</T>
              </View>
            </View>
          )}
          {won.map((name) => <MilestoneCard key={name} icon="flag" title="Challenge complete" detail={name} />)}
          {ms.map((x) => <MilestoneCard key={x.id} icon={x.icon} title={x.title} detail={x.detail} />)}
          {ms.length || won.length ? <Gap h={space.sm} /> : null}
          <Records v={v} w={w} />
          <Gap />
        </>
      )}
      <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 20 }}>How did that feel?</T>
      <T v="small" style={{ marginTop: 2, marginBottom: space.sm }}>Optional: helps you spot when you’re overreaching or coasting.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {FEELINGS.map((f) => {
          const on = w?.feeling === f.id;
          return (
            <Pressable key={f.id} accessibilityRole="radio" aria-checked={on} accessibilityLabel={`${f.id}: ${f.hint}`} onPress={() => pick(f.id)}
              style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, alignItems: 'center', gap: 2, padding: space.md, borderRadius: radius.md, borderWidth: on ? 2 : 1,
                borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accentSoft : c.card, opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name={ICONS[f.id]} size={22} color={c.accent} />
              <T style={{ fontWeight: '600' }}>{f.id}</T>
              <T v="small" center style={{ fontSize: 11 }}>{f.hint}</T>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
        {w && <View style={{ flex: 1 }}><ShareWorkout w={w} title="Share" /></View>}
        <Button title="Done" onPress={close} style={{ flex: 1, minHeight: 40 }} />
      </View>
    </Screen>
    <Confetti on={party} />
    </View>
  );
}
