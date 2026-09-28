import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FEELINGS } from '../model';
import { goBack } from '../components';
import { useEditWorkout } from '../workout';
import { Button, Choice, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

/** After Finish: how did it feel? Optional; helps spot overreaching or coasting. */
export default function Feeling() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const edit = useEditWorkout(id);
  const pick = (feeling: string) => { if (feeling) edit((w) => ({ ...w, feeling })); goBack(); };
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="How did that feel?" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T v="small" style={{ marginBottom: space.md }}>Workout saved. Optional: helps you spot when you’re overreaching or coasting.</T>
      <View style={{ gap: space.sm }}>
        {FEELINGS.map((f) => <Choice key={f.id} lead={f.emoji} label={f.id} hint={f.hint} onPress={() => pick(f.id)} />)}
      </View>
      <Button title="Skip" kind="ghost" style={{ marginTop: space.md }} onPress={() => pick('')} />
    </Screen>
  );
}
