import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { daysAgo, duration, getEx, newId, nextInPlan, putTemplate, today, upNext, type Template } from '../../model';
import { PLANS } from '../../exercises';
import { useLog, useTheme } from '../../store';
import { useNow } from '../../timer';
import { ask } from '../../io';
import { Empty } from '../../components';
import { useWorkoutFlow } from '../../workout';
import { Button, Card, Gap, Header, Screen, T } from '../../ui';
import { sans, radius, space } from '../../theme';

const ago = (day: string) => { const d = daysAgo(day, today()); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 60 ? `${d} days ago` : new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };

/** Start a workout: pick a template (it opens a preview first), or start an empty one. */
/** Template cards, two to a row, the most recently done first. */
function Tiles({ list }: { list: Template[] }) {
  const { v } = useLog();
  const { c } = useTheme();
  const lastOf = (t: Template) => v.workouts.find((w) => !w.active && (w.templateId === t.id || w.name === t.name));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {[...list].sort((a, b) => (lastOf(b)?.startedAt ?? 0) - (lastOf(a)?.startedAt ?? 0)).map((t) => {
        const last = lastOf(t);
        return (
          <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.name} template`}
            onPress={() => router.push({ pathname: '/template', params: { id: t.id } })}
            style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, minHeight: 124, padding: space.md, borderRadius: radius.md,
              backgroundColor: c.card, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.7 : 1, gap: 4 })}>
            <T numberOfLines={1} style={{ fontFamily: sans, fontWeight: '700', fontSize: 18 }}>{t.name}</T>
            <T v="small" numberOfLines={3} style={{ fontSize: 13, lineHeight: 18, flex: 1 }}>
              {t.exercises.map((e) => getEx(v, e.exerciseId).name).join(', ') || 'No exercises yet'}
            </T>
            <T v="small" style={{ fontSize: 12 }}>{last ? `Last: ${ago(last.date)}` : 'Not done yet'}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function StartWorkout() {
  const { v, update } = useLog();
  const { c } = useTheme();
  const flow = useWorkoutFlow();
  const now = useNow(!!v.active);
  const mine = v.templates.filter((t) => !t.starter);
  async function newTemplate() {
    const name = await ask('Template name (e.g. Leg Day)');
    if (!name) return;
    const id = newId('t');
    update((l) => putTemplate(l, { id, name: name.slice(0, 60), exercises: [] }));
    router.push({ pathname: '/template', params: { id, edit: '1' } });
  }

  return (
    <Screen>
      <Header title="Start workout" />
      {v.active && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Resume ${v.active.name}`} onPress={() => router.push('/active')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, borderColor: c.accent, marginBottom: space.md }}>
            <Ionicons name="pulse" size={22} color={c.accent} />
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: sans, fontWeight: '600', fontSize: 18 }}>{v.active.name}</T>
              <T v="small">In progress · <T v="small" style={{ fontFamily: sans }}>{duration(now - v.active.startedAt)}</T></T>
            </View>
            <T style={{ fontWeight: '700' }} color={c.accent}>Resume</T>
          </Card>
        </Pressable>
      )}
      {!v.active && <UpNext />}
      <T v="label">Quick start</T>
      <Gap h={space.sm} />
      <Button title="Start an empty workout" icon="add" onPress={() => flow.start()} kind="secondary" />
      <Gap h={space.sm} />
      <Button title={v.active ? 'Add an activity to your workout' : 'Log an activity'} icon="walk-outline" kind="secondary"
        onPress={() => router.push({ pathname: '/picker', params: { activity: '1', ...(v.active ? { workout: v.active.id } : {}) } })} />
      <T v="small" style={{ marginTop: 4, fontSize: 12 }}>A run, a yoga class, a match: time, distance or intensity, and calories.</T>
      <Gap />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T v="label">My templates ({mine.length})</T>
        <Button title="Template" icon="add" kind="ghost" onPress={newTemplate} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
      </View>
      <Gap h={space.sm} />
      {mine.length ? <Tiles list={mine} /> : (
        <Card><Empty>No templates yet. Start from a ready-made one below, build your own, or save a finished workout as a template from History.</Empty></Card>
      )}
      {/* Ready-made ones sit in their own mint panel, so they never read as yours. */}
      <View style={{ marginTop: space.xl, backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: space.md, paddingTop: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="sparkles-outline" size={20} color={c.accent} />
          <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 20 }}>Ready-made by Uplift</T>
        </View>
        <T v="small" style={{ marginTop: 4, marginBottom: space.md, color: c.text }}>Plans by muscle group to get you going. Open one to start it, or change it and it becomes yours.</T>
        <T v="label" style={{ marginBottom: space.sm }}>Plans · one template per session, in turn</T>
        <View style={{ gap: space.sm, marginBottom: space.lg }}>
          {PLANS.map((p) => {
            const last = v.workouts.find((w) => !w.active && w.templateId && p.templates.includes(w.templateId));
            const next = last ? nextInPlan(p, last.templateId) : p.templates[0];
            const names = p.templates.map((id) => v.templates.find((t) => t.id === id)?.name ?? id);
            return (
              <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name} plan. Next: ${v.templates.find((t) => t.id === next)?.name}`}
                onPress={() => router.push({ pathname: '/template', params: { id: next } })}
                style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: space.md, gap: 2, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
                  <T style={{ flex: 1, fontFamily: sans, fontWeight: '700', fontSize: 18 }}>{p.name}</T>
                  <T v="small" style={{ fontSize: 12 }}>{p.days}</T>
                </View>
                <T v="small" style={{ fontSize: 13 }}>{p.about}</T>
                <T style={{ fontSize: 14, marginTop: 2 }}>{names.join(' → ')}</T>
                <T style={{ fontSize: 13, fontWeight: '700', marginTop: 2 }} color={c.accent}>{last ? `Next up: ${v.templates.find((t) => t.id === next)?.name}` : `Start with ${names[0]}`} →</T>
              </Pressable>
            );
          })}
        </View>
        <T v="label" style={{ marginBottom: space.sm }}>Single workouts</T>
        <Tiles list={v.templates.filter((t) => t.starter)} />
      </View>
    </Screen>
  );
}

/** What to do today: the next workout of your plan, or one for the muscles you've skipped. */
function UpNext() {
  const { v } = useLog();
  const { c } = useTheme();
  const flow = useWorkoutFlow();
  const n = upNext(v, today());
  const t = v.templates.find((x) => x.id === n.templateId);
  if (!t) return null;
  return (
    <View style={{ backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: space.md, marginBottom: space.lg, gap: 4 }}>
      <T v="label" color={c.accent}>What to do today</T>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t.name}: see the template`} onPress={() => router.push({ pathname: '/template', params: { id: t.id } })}>
        <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 22 }}>{t.name}</T>
        <T v="small" style={{ color: c.text }}>{n.reason}</T>
        <T v="small" numberOfLines={2} style={{ marginTop: 2 }}>{t.exercises.map((e) => getEx(v, e.exerciseId).name).join(', ')}</T>
      </Pressable>
      <Button title={`Start ${t.name}`} icon="play" onPress={() => flow.start(t.id)} style={{ marginTop: space.sm }} />
    </View>
  );
}
