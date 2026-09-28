import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FEELINGS } from '../model';
import { goBack, Records, ShareWorkout } from '../components';
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
  const pick = (feeling: string) => { if (feeling) edit((w) => ({ ...w, feeling })); goBack(); };
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Workout saved" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      {w && (
        <>
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
  );
}
