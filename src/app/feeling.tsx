import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FEELINGS, recordsOf, weekStart } from '../model';
import { newMilestones } from '../fun';
import { Confetti, goBack, MilestoneCard, Records, Ring, ShareWorkout } from '../components';
import { useLog } from '../store';
import { useEditWorkout } from '../workout';
import { Button, Choice, Gap, Header, IconButton, Screen, T } from '../ui';
import { sans, space } from '../theme';

const ICONS = { Easy: 'leaf-outline', Moderate: 'pulse-outline', Hard: 'flame-outline', 'Max effort': 'flash-outline' } as const;

/** After Finish: any new personal bests and a picture to share, then how did it feel? (optional; helps spot overreaching or coasting). */
export default function Feeling() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const edit = useEditWorkout(id);
  const { v } = useLog();
  const w = v.workouts.find((x) => x.id === id && !x.active);
  const goal = v.profile.weeklyGoal ?? 0;
  const ms = w ? newMilestones(v, w, goal) : [];
  // This workout closed the ring: it's the goal-th of its week.
  const nth = w ? v.workouts.filter((x) => !x.active && weekStart(x.date) === weekStart(w.date) && x.startedAt <= w.startedAt).length : 0;
  const closed = !!goal && nth === goal;
  const party = !!w && (closed || ms.length > 0 || recordsOf(v, w).length > 0);
  const pick = (feeling: string) => { if (feeling) edit((w) => ({ ...w, feeling })); goBack(); };
  return (
    <View style={{ flex: 1 }}>
    <Screen edges={['top', 'bottom']}>
      <Header title="Workout saved" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      {w && (
        <>
          {closed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm }}>
              <Ring done={goal} goal={goal} size={56} />
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 18 }}>Weekly goal met</T>
                <T v="small">{goal} of {goal} this week. Everything else is a bonus.</T>
              </View>
            </View>
          )}
          {ms.map((x) => <MilestoneCard key={x.id} icon={x.icon} title={x.title} detail={x.detail} />)}
          {ms.length ? <Gap h={space.sm} /> : null}
          <Records v={v} w={w} />
          <Gap h={space.sm} />
          <ShareWorkout w={w} />
          <Gap />
        </>
      )}
      <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 22 }}>How did that feel?</T>
      <T v="small" style={{ marginTop: 2, marginBottom: space.md }}>Optional: helps you spot when you’re overreaching or coasting.</T>
      <View style={{ gap: space.sm }}>
        {FEELINGS.map((f) => <Choice key={f.id} icon={ICONS[f.id]} label={f.id} hint={f.hint} onPress={() => pick(f.id)} />)}
      </View>
      <Button title="Skip" kind="ghost" style={{ marginTop: space.md }} onPress={() => pick('')} />
    </Screen>
    <Confetti on={party} />
    </View>
  );
}
