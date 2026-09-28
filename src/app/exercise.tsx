import { Image, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addExercises, delExercise, getEx, hasArt, historyOf, isCustom, isTimed, num, prOf, putWorkout, startWorkout, viewOf, WEIGHT_TYPES } from '../model';
import { useLog, useTheme } from '../store';
import { confirm, notify, pickImage } from '../io';
import { Empty, ExArt, goBack, Illustration, ProgressBlock, Star, Tag } from '../components';
import { Button, Gap, Header, IconButton, Screen, T } from '../ui';
import { radius, space } from '../theme';

/** One exercise: form cues, your photo, and your progress on it. */
export default function ExerciseDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { v, update, photo, setImage } = useLog();
  const { c } = useTheme();
  const ex = getEx(v, id);
  const custom = isCustom(v, id);
  const pr = prOf(v, id);
  const uri = photo(id);
  const logged = historyOf(v, id).length > 0;

  async function addPhoto() {
    try { const img = await pickImage(); if (img) setImage(id, img); }
    catch (e) { notify('Could not add the photo', (e as Error).message); }
  }
  /** Into the workout in progress, or a new empty one with this exercise in it. */
  function addToWorkout() {
    update((l) => {
      const started = viewOf(l).active ? l : startWorkout(l);
      const w = viewOf(started).active!;
      return putWorkout(started, addExercises(w, viewOf(started), [id]));
    });
    router.replace('/active');
  }
  async function remove() {
    if (!(await confirm('Delete this custom exercise?', 'Its logged history stays in History.', 'Delete', true))) return;
    update((l) => delExercise(l, id));
    goBack();
  }
  const cue = (title: string, items: string[], color: string) => items.length ? (
    <View style={{ gap: 4 }}>
      <T v="label" style={{ color }}>{title}</T>
      {items.map((x, i) => <T key={i} style={{ fontSize: 15, lineHeight: 21, color: title === 'Avoid' ? c.muted : c.text }}>• {x}</T>)}
    </View>
  ) : null;

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={ex.name} right={<><Star id={id} /><IconButton icon="close" label="Close" onPress={goBack} /></>} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        <Tag label={ex.group} />
        {ex.equip ? <Tag label={ex.equip} /> : null}
        {!isTimed(ex) && <Tag label={WEIGHT_TYPES.find((t) => t.id === ex.weightType)?.unit ?? ex.weightType} />}
        {custom && <Tag label="Custom" tone="accent" />}
        {pr > 0 && <Tag label={`PR ${num(pr)}`} />}
      </View>
      <Gap h={space.md} />
      {uri ? (
        <>
          <Image source={{ uri }} accessibilityLabel={`${ex.name} reference photo`} resizeMode="cover"
            style={{ width: '100%', height: 260, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.chip }} />
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
            <Button title="Replace photo" kind="ghost" onPress={addPhoto} style={{ minHeight: 40 }} />
            <Button title="Remove" kind="ghost" onPress={async () => { if (await confirm('Remove this photo?', '', 'Remove', true)) setImage(id, null); }} style={{ minHeight: 40 }} />
          </View>
        </>
      ) : (
        <>
          {hasArt(id) && (
            <View style={{ alignItems: 'center', backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingVertical: space.md }}>
              <Illustration id={id} size={240} animate label={`${ex.name}, shown step by step`} />
              <T v="small" style={{ fontSize: 11, marginTop: space.xs }}>Illustration: Workout Guide · Everkinetic · CC BY-SA 4.0</T>
            </View>
          )}
          <Button title="Add your own photo or GIF" icon="camera-outline" kind="ghost" onPress={addPhoto} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
        </>
      )}
      <Gap h={space.md} />
      {isTimed(ex) ? (
        <View style={{ gap: space.sm }}>
          {!hasArt(id) && <View style={{ alignItems: 'center', paddingVertical: space.md }}><ExArt id={id} size={96} /></View>}
          <T v="label">Intensity, by the talk test</T>
          {[['Light', 'you could sing'], ['Moderate', 'you can talk, not sing'], ['Vigorous', 'only a few words at a time']].map(([k, d]) => (
            <T key={k} style={{ fontSize: 15 }}>• <T style={{ fontWeight: '600', fontSize: 15 }}>{k}</T>: {d}</T>
          ))}
          <T v="small">{ex.kind === 'cardio' ? 'Log time and distance; pace and calories are worked out for you.' : 'Log the time and how hard it felt; calories are worked out for you.'}</T>
        </View>
      ) : ex.setup.length || ex.exec.length || ex.avoid.length ? (
        <View style={{ gap: space.md }}>
          {cue('Set up', ex.setup, c.text)}
          {cue('Execute', ex.exec, c.accent)}
          {cue('Avoid', ex.avoid, c.muted)}
        </View>
      ) : <Empty>No form notes for this one yet{custom ? '. Tap Edit to add some.' : '.'}</Empty>}
      <Gap />
      <Button title={v.active ? `Add to ${v.active.name}` : 'Start a workout with this'} onPress={addToWorkout} />
      {custom && (
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Button title="Edit" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/edit-exercise', params: { id } })} />
          <Button title="Delete" kind="danger" style={{ flex: 1 }} onPress={remove} />
        </View>
      )}
      <Gap />
      <T v="label">Progress</T>
      {logged ? <ProgressBlock v={v} id={id} /> : <Empty>No sets logged for this exercise yet.</Empty>}
    </Screen>
  );
}
