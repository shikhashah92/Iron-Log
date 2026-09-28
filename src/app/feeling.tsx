import { View } from 'react-native';
import { endWorkout, FEELINGS } from '../model';
import { useLog } from '../store';
import { goBack } from '../components';
import { Button, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

/** Ending a workout: how did it feel? Optional, helps spot overreaching or coasting. */
export default function Feeling() {
  const { update } = useLog();
  const finish = (feeling: string) => { update((l) => endWorkout(l, feeling)); goBack(); };
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="How did that feel?" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T v="small" style={{ marginBottom: space.md }}>Optional. Helps you spot when you’re overreaching or coasting.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {FEELINGS.map((f) => <Button key={f.id} title={`${f.emoji} ${f.id}`} kind="secondary" style={{ flexBasis: '47%', flexGrow: 1 }} onPress={() => finish(f.id)} />)}
      </View>
      <Button title="Skip" kind="ghost" style={{ marginTop: space.md }} onPress={() => finish('')} />
    </Screen>
  );
}
