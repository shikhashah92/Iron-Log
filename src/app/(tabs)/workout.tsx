import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ACTIVITY_GROUPS, allExercises, isCustom, matches, daysAgo, duration, getEx, logPastWorkout, newId, nextInPlan, putTemplate, today, type Template } from '../../model';
import { GROUPS, PLANS } from '../../exercises';
import { Empty, ExRow, GroupChips, inGroup } from '../../components';
import { useLog, useTheme } from '../../store';
import { useNow } from '../../timer';
import { ask } from '../../io';
import { useWorkoutFlow } from '../../workout';
import { Button, Card, Field, Gap, Header, Screen, Segmented, T } from '../../ui';
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
  const singles = v.templates.filter((t) => t.starter);
  const [all, setAll] = useState(false);
  const [tab, setTab] = useState<'start' | 'library'>('start');
  async function newTemplate() {
    const name = await ask('Template name (e.g. Leg Day)');
    if (!name) return;
    const id = newId('t');
    update((l) => putTemplate(l, { id, name: name.slice(0, 60), exercises: [] }));
    router.push({ pathname: '/template', params: { id, edit: '1' } });
  }

  return (
    <Screen>
      <Header title="Train" right={tab === 'library' ? <Button title="Add" icon="add" kind="secondary" onPress={() => router.push('/edit-exercise')} style={{ minHeight: 44, paddingHorizontal: space.md }} /> : undefined} />
      <Segmented value={tab} onChange={setTab} options={[{ id: 'start', label: 'Workouts' }, { id: 'library', label: 'Exercises' }]} />
      <Gap h={space.md} />
      {tab === 'library' ? <Library /> : <>
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
      {/* The other ways in, side by side: an empty workout, an activity, one you forgot to log. */}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {([
          ['add', 'Empty', 'workout', () => flow.start()],
          ['walk-outline', 'Activity', v.active ? 'add to this one' : 'run, class, match', () => router.push({ pathname: '/picker', params: { activity: '1', ...(v.active ? { workout: v.active.id } : {}) } })],
          ['time-outline', 'Past', 'workout you forgot', () => {
            let id = '';
            update((l) => { const r = logPastWorkout(l, Date.now() - 86_400_000); id = r.id; return r.log; });
            router.push({ pathname: '/edit-workout', params: { id } });
          }],
        ] as [keyof typeof Ionicons.glyphMap, string, string, () => void][]).map(([icon, title, sub, go]) => (
          <Pressable key={title} accessibilityRole="button" accessibilityLabel={`${title}: ${sub}`} onPress={go}
            style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name={icon} size={22} color={c.accent} />
            <T style={{ fontWeight: '600' }}>{title}</T>
            <T v="small" center numberOfLines={2} style={{ fontSize: 12, lineHeight: 15 }}>{sub}</T>
          </Pressable>
        ))}
      </View>
      <Gap />
      {mine.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="label">My templates ({mine.length})</T>
          <Button title="Template" icon="add" kind="ghost" onPress={newTemplate} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
        </View>
        <Gap h={space.sm} />
        <Tiles list={mine} />
      </> : (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}>
          <T style={{ flex: 1 }}>My templates <T v="small">· none yet</T></T>
          <Button title="Template" icon="add" kind="ghost" onPress={newTemplate} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
        </Card>
      )}
      {/* Ready-made ones sit in their own mint panel, so they never read as yours. */}
      <View style={{ marginTop: space.xl, backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: space.md, paddingTop: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="sparkles-outline" size={20} color={c.accent} />
          <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 20 }}>Ready-made by Uplift</T>
        </View>
        <T v="small" style={{ marginTop: 4, marginBottom: space.md, color: c.text }}>Open one to start it. Change it and it becomes yours.</T>
        <T v="label" style={{ marginBottom: space.sm }}>Plans · one workout per session, in turn</T>
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
                <T v="small" style={{ fontSize: 13 }}>{names.join(' → ')}</T>
                <T style={{ fontSize: 13, fontWeight: '700', marginTop: 2 }} color={c.accent}>{last ? `Next up: ${v.templates.find((t) => t.id === next)?.name}` : `Start with ${names[0]}`} →</T>
              </Pressable>
            );
          })}
        </View>
        <T v="label" style={{ marginBottom: space.sm }}>Single workouts</T>
        <Tiles list={all ? singles : singles.slice(0, 4)} />
        {singles.length > 4 && <Button title={all ? 'Show fewer' : `See all ${singles.length}`} kind="ghost" onPress={() => setAll(!all)} style={{ marginTop: space.xs }} />}
      </View>
      </>}
    </Screen>
  );
}

/** The exercise library: search, filter, and every exercise by group (custom ones last). */
function Library() {
  const { v } = useLog();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('All');
  const all = allExercises(v);
  const query = q.trim().toLowerCase();
  const items = all.filter((e) => inGroup(v, e, group) && matches(e, query)).sort((a, b) => a.name.localeCompare(b.name));
  // Grouped by muscle when browsing everything; a flat list when searching or filtered.
  const sections = query || group !== 'All'
    ? [{ title: '', list: items }]
    : [...[...GROUPS, ...ACTIVITY_GROUPS].map((g) => ({ title: g, list: items.filter((e) => e.group === g && !isCustom(v, e.id)) })),
      { title: 'Custom', list: items.filter((e) => isCustom(v, e.id)) }].filter((x) => x.list.length);
  return (
    <>
      <Field placeholder={`Search ${all.length} exercises…`} value={q} onChangeText={setQ} autoCorrect={false} accessibilityLabel="Search exercises" inputMode="search" />
      <GroupChips group={group} onChange={setGroup} />
      {!items.length ? <Empty>No exercises match.</Empty> : sections.map((x) => (
        <View key={x.title} style={{ marginBottom: space.md }}>
          {x.title ? <T v="label" style={{ marginBottom: space.xs, marginLeft: 2 }}>{x.title}</T> : null}
          <Card pad={false} style={{ paddingHorizontal: space.md }}>
            {x.list.map((e, i) => <ExRow key={e.id} ex={e} last={i === x.list.length - 1} />)}
          </Card>
        </View>
      ))}
    </>
  );
}
