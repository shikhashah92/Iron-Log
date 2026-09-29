import { View } from 'react-native';
import { longDate } from '../model';
import { MILESTONES, milestonesOf, progressLabel, type Track } from '../fun';
import { useLog } from '../store';
import { goBack, MilestoneCard } from '../components';
import { Card, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

const TRACKS: [Track, string][] = [['workouts', 'Workouts'], ['bests', 'Personal bests'], ['goals', 'Weekly goal'], ['tonnes', 'Lifted'], ['km', 'Distance'], ['yoga', 'Yoga'], ['surya', 'Surya Namaskar']];

/** Every milestone: the ones you've earned (with the day), and what's next on each track. */
export default function Trophies() {
  const { v } = useLog();
  const goal = v.profile.weeklyGoal ?? 0;
  const { earned, upcoming } = milestonesOf(v, goal);
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Trophies" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T v="small" style={{ marginBottom: space.md }}>{earned.length} of {MILESTONES.filter((m) => goal || m.track !== 'goals').length} earned. Worked out from your log, on this phone.</T>
      {TRACKS.filter(([t]) => goal || t !== 'goals').map(([track, label]) => {
        const got = earned.filter((e) => e.track === track);
        const next = upcoming.find((u) => u.track === track);
        return (
          <View key={track} style={{ marginBottom: space.md }}>
            <T v="label" style={{ marginBottom: space.xs }}>{label}</T>
            <Card pad={false} style={{ paddingHorizontal: space.md }}>
              {got.map((e) => <MilestoneCard key={e.id} icon={e.icon} title={e.title} detail={e.detail} sub={longDate(e.date)} />)}
              {next ? <MilestoneCard icon={next.icon} title={next.title} detail={next.detail} sub={progressLabel(next)} locked /> : null}
              {!got.length && !next ? <T v="small" style={{ paddingVertical: space.md }}>All done here. Remarkable.</T> : null}
            </Card>
          </View>
        );
      })}
      {!goal ? <T v="small">Set a weekly goal on Home to unlock the weekly-goal trophies.</T> : null}
    </Screen>
  );
}
