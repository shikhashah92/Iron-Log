import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getEx, putTemplate } from '../model';
import { useLog } from '../store';
import { ask } from '../io';
import { Empty, ExRow, goBack } from '../components';
import { Button, Card, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

/** Edit one template: rename it, add or remove exercises. */
export default function TemplateEdit() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { v, update } = useLog();
  const t = v.templates.find((x) => x.id === id);
  if (!t) return <Screen><Header title="Template" right={<IconButton icon="close" label="Close" onPress={goBack} />} /><Empty>Template not found.</Empty></Screen>;
  const rename = async () => { const name = await ask('Rename template', t.name); if (name) update((l) => putTemplate(l, { ...t, name: name.slice(0, 60) })); };
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.name} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
        <Button title="Rename" kind="secondary" onPress={rename} style={{ minHeight: 40 }} />
      </View>
      <Card pad={false} style={{ paddingHorizontal: space.md }}>
        {t.exerciseIds.length ? t.exerciseIds.map((x, i) => (
          <ExRow key={x} ex={getEx(v, x)} star={false} last={i === t.exerciseIds.length - 1}
            actions={<IconButton icon="remove-circle-outline" label={`Remove ${getEx(v, x).name}`} onPress={() => update((l) => putTemplate(l, { ...t, exerciseIds: t.exerciseIds.filter((y) => y !== x) }))} />} />
        )) : <View style={{ padding: space.md }}><T v="small">No exercises yet. Tap “Add exercise” below.</T></View>}
      </Card>
      <Button title="Add exercise" icon="add" style={{ marginTop: space.md }} onPress={() => router.push({ pathname: '/picker', params: { template: t.id } })} />
    </Screen>
  );
}
