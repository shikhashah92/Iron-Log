import { View } from 'react-native';
import { router } from 'expo-router';
import { delTemplate, newId, plural, putTemplate, startTemplate } from '../model';
import { useLog } from '../store';
import { ask, confirm } from '../io';
import { Empty, goBack } from '../components';
import { Button, Card, Header, IconButton, Row, Screen } from '../ui';
import { space } from '../theme';

/** Saved workouts, e.g. "Leg Day": start one with a tap. */
export default function Templates() {
  const { v, update } = useLog();
  async function add() {
    const name = await ask('Template name (e.g. Leg Day)');
    if (!name) return;
    const id = newId('t');
    update((l) => putTemplate(l, { id, name: name.slice(0, 60), exerciseIds: [] }));
    router.push({ pathname: '/template', params: { id } });
  }
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Templates" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        {v.templates.length ? v.templates.map((t, i) => (
          <Row key={t.id} title={t.name} subtitle={plural(t.exerciseIds.length, 'exercise')} last={i === v.templates.length - 1}
            onPress={() => router.push({ pathname: '/template', params: { id: t.id } })}
            right={
              <View style={{ flexDirection: 'row', gap: space.xs }}>
                <Button title="Start" kind="secondary" style={{ minHeight: 40, paddingHorizontal: space.md }}
                  onPress={() => { update((l) => startTemplate(l, t.exerciseIds)); router.dismissTo('/workout'); }} />
                <IconButton icon="trash-outline" label={`Delete ${t.name}`} size={20} onPress={async () => {
                  if (await confirm(`Delete the template “${t.name}”?`, 'Workouts you already logged are not affected.', 'Delete', true)) update((l) => delTemplate(l, t.id));
                }} />
              </View>
            } />
        )) : <Empty>No templates yet. Build one once, e.g. “Leg Day” with your usual exercises, then start it with one tap.</Empty>}
      </Card>
      <Button title="New template" icon="add" onPress={add} style={{ marginTop: space.md }} />
    </Screen>
  );
}
