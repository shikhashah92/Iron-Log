import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addProfile, delProfile, putProfile, switchProfile } from '../model';
import { useLog, useTheme } from '../store';
import { ask, confirm } from '../io';
import { goBack, Tag } from '../components';
import { Button, Card, Header, IconButton, Row, Screen, T } from '../ui';
import { space } from '../theme';

/** Several people on one phone: each has their own exercises, workouts and history. */
export default function Profiles() {
  const { log, update } = useLog();
  const { c } = useTheme();
  const cur = log.settings.currentProfileId;
  async function add() {
    const name = await ask('New profile name (e.g. a family member’s name)');
    if (name) { update((l) => addProfile(l, name.slice(0, 40))); goBack(); }
  }
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Profiles" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T v="small" style={{ marginBottom: space.md }}>Switch between people sharing this phone. Each profile has its own exercises, workouts and history.</T>
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        {log.profiles.map((p, i) => (
          <Row key={p.id} title={p.name} last={i === log.profiles.length - 1}
            left={<Ionicons name={p.id === cur ? 'person-circle' : 'person-circle-outline'} size={28} color={p.id === cur ? c.accent : c.muted} />}
            onPress={p.id === cur ? undefined : () => { update((l) => switchProfile(l, p.id)); goBack(); }}
            actions={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                {p.id === cur && <Tag label="Current" tone="accent" />}
                <IconButton icon="pencil-outline" label={`Rename ${p.name}`} size={20} onPress={async () => { const n = await ask('Rename profile', p.name); if (n) update((l) => putProfile(l, p.id, { name: n.slice(0, 40) })); }} />
                {log.profiles.length > 1 && (
                  <IconButton icon="trash-outline" label={`Delete ${p.name}`} size={20} onPress={async () => {
                    if (await confirm(`Delete the profile “${p.name}”?`, 'This removes their workouts and history from this device. You can go back from Undo history.', 'Delete', true))
                      update((l) => delProfile(l, p.id));
                  }} />
                )}
              </View>
            } />
        ))}
      </Card>
      <Button title="New profile" icon="add" onPress={add} style={{ marginTop: space.md }} />
    </Screen>
  );
}
