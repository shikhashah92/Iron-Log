import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { longDate, num, plural, putProfile, today, type ChallengeDef, type JoinedChallenge } from '../model';
import { CHALLENGES, challengeLink, challengeProgress, challengeUnit, readChallenge } from '../fun';
import { useLog, useTheme } from '../store';
import { confirm, notify } from '../io';
import { goBack } from '../components';
import { Button, Card, Field, Gap, Header, IconButton, Screen, T } from '../ui';
import { radius, sans, space } from '../theme';

/** Share a challenge as a link: the whole challenge is in it (and who sent it), so it needs no account or server. */
export async function shareChallenge(d: ChallengeDef, from: string) {
  const url = challengeLink({ ...d, from });
  const text = `${from} challenges you on Uplift: ${d.name}. Up for it?`;
  try { if (navigator.share) { await navigator.share({ title: d.name, text, url }); return; } } catch (e) { if ((e as Error).name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); notify('Link copied', 'Paste it into WhatsApp or a message.'); }
  catch { notify('Here’s the link', url); }
}

/** Your challenges (progress, days left), ones to join, and a friend's link or code to add. */
export default function Challenges() {
  const { v, update } = useLog();
  const { c } = useTheme();
  const iso = today();
  const joined = v.profile.challenges ?? [];
  const [code, setCode] = useState('');
  const save = (list: JoinedChallenge[]) => update((l) => putProfile(l, v.profile.id, { challenges: list }));
  const join = (id: string, def?: ChallengeDef) => { save([...joined.filter((x) => x.id !== id), { id, start: iso, ...(def ? { def } : {}) }]); };
  async function leave(j: JoinedChallenge, name: string) {
    if (await confirm(`Leave “${name}”?`, 'Your workouts stay as they are. You can join again any time (it starts over).', 'Leave', true)) save(joined.filter((x) => x.id !== j.id));
  }
  function add() {
    const d = readChallenge(code);
    if (!d) return notify('That isn’t a challenge link', 'Paste the whole link your friend sent, or its code.');
    setCode('');
    router.push({ pathname: '/challenge', params: { c: challengeLink(d).split('c=')[1] } });
  }
  const mine = joined.map((j) => ({ j, p: challengeProgress(v, j, iso) })).filter((x) => x.p);
  const open = CHALLENGES.filter((x) => !joined.some((j) => j.id === x.id));
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Challenges" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T v="small">Just you against the clock. Your workouts count toward them automatically.</T>
      <Gap />
      {mine.length ? <T v="label" style={{ marginBottom: space.xs }}>Yours</T> : null}
      {mine.map(({ j, p }) => {
        const unit = challengeUnit(p!.def, v);
        const pct = Math.min(1, p!.done / p!.target);
        return (
          <Card key={j.id} style={{ marginBottom: space.sm, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name={p!.completedOn ? 'trophy' : p!.over ? 'hourglass-outline' : 'flag-outline'} size={20} color={p!.over ? c.muted : c.accent} />
              <T style={{ flex: 1, fontFamily: sans, fontWeight: '700', fontSize: 17 }}>{p!.def.name}</T>
            </View>
            {p!.def.from ? <T v="small">From {p!.def.from}</T> : null}
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.chip, overflow: 'hidden' }}>
              <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 5, backgroundColor: p!.over ? c.muted : c.brand }} />
            </View>
            <T v="small" style={{ color: c.text }}>
              {p!.def.kind === 'best' ? `Best so far: ${num(p!.done)} of ${num(p!.target)} ${unit}` : `${num(p!.done)} of ${num(p!.target)} ${unit}`}
              {' · '}{p!.completedOn ? `Done on ${longDate(p!.completedOn)}` : p!.over ? 'Time ran out' : `${plural(p!.daysLeft + 1, 'day')} left`}
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' }}>
              <Button title="Challenge a friend" icon="share-social-outline" kind="ghost" onPress={() => shareChallenge(p!.def, v.profile.name)} style={{ minHeight: 36, paddingHorizontal: space.sm }} />
              <Button title={p!.completedOn || p!.over ? 'Remove' : 'Leave'} kind="ghost" onPress={() => leave(j, p!.def.name)} style={{ minHeight: 36, paddingHorizontal: space.sm }} />
            </View>
          </Card>
        );
      })}
      {open.length ? <T v="label" style={{ marginTop: space.md, marginBottom: space.xs }}>Join one</T> : null}
      {open.map((x) => (
        <Card key={x.id} style={{ marginBottom: space.sm, gap: 4 }}>
          <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 17 }}>{x.name}</T>
          <T v="small">{x.about}</T>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
            <Button title="Join" icon="flag-outline" onPress={() => join(x.id)} style={{ minHeight: 40, paddingHorizontal: space.lg }} />
            <Button title="Challenge a friend" icon="share-social-outline" kind="ghost" onPress={() => shareChallenge(x, v.profile.name)} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
          </View>
        </Card>
      ))}
      <T v="label" style={{ marginTop: space.md, marginBottom: space.xs }}>Got a challenge from a friend?</T>
      <View style={{ backgroundColor: c.chip, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
        <Field placeholder="Paste the link or code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Challenge link or code" />
        <Button title="Add it" kind="secondary" onPress={add} disabled={!code.trim()} />
      </View>
      <Gap />
    </Screen>
  );
}
