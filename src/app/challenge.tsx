import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getEx, num, plural, putProfile, today } from '../model';
import { challengeId, challengeUnit, readChallenge } from '../fun';
import { useLog, useTheme } from '../store';
import { goBack } from '../components';
import { Button, Gap, Header, IconButton, Screen, T } from '../ui';
import { radius, sans, space } from '../theme';

export const PENDING = 'uplift.pendingChallenge';

/** A friend's challenge from a link (`?c=`): what it asks, and Accept. Nothing is sent back: it only lives on this phone. */
export default function ChallengeInvite() {
  const { c: code = '' } = useLocalSearchParams<{ c?: string }>();
  const { v, update } = useLog();
  const { c } = useTheme();
  useEffect(() => { try { localStorage.removeItem(PENDING); } catch { /* fine */ } }, []);
  const d = readChallenge(`?c=${code}`);
  if (!d) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="Challenge" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
        <T>This link doesn’t hold a challenge Uplift can read. Ask your friend to send it again.</T>
      </Screen>
    );
  }
  const id = challengeId(d);
  const already = v.profile.challenges?.some((x) => x.id === id);
  const unit = challengeUnit(d, v);
  const what = d.kind === 'workouts' ? `${num(d.target)} workouts of any kind`
    : d.kind === 'days' ? `${getEx(v, d.exerciseId!).name} on ${plural(d.target, 'day')}`
    : d.kind === 'daily' ? `${num(d.perDay!)} ${unit} of ${getEx(v, d.exerciseId!).name} a day, on ${plural(d.target, 'day')}`
    : d.kind === 'total' ? `${num(d.target)} ${unit} of ${getEx(v, d.exerciseId!).name} in all`
    : `one set of ${getEx(v, d.exerciseId!).name} at ${num(d.target)} ${unit} or more`;
  function accept() {
    update((l) => putProfile(l, v.profile.id, { challenges: [...(v.profile.challenges ?? []).filter((x) => x.id !== id), { id, start: today(), def: d! }] }));
    router.replace('/challenges');
  }
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="A challenge for you" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <View style={{ backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
        <Ionicons name="flag" size={28} color={c.accent} />
        {d.from ? <T v="label" color={c.accent}>From {d.from}</T> : null}
        <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 26, lineHeight: 30 }}>{d.name}</T>
        <T style={{ color: c.text }}>The task: {what}, within {plural(d.days, 'day')} of accepting.</T>
      </View>
      <Gap />
      {already ? <T v="small" center>You’ve already accepted this one.</T> : <Button title="Accept the challenge" icon="checkmark" onPress={accept} />}
      <Gap h={space.sm} />
      <Button title={already ? 'See my challenges' : 'Not now'} kind="ghost" onPress={() => (already ? router.replace('/challenges') : goBack())} />
      <T v="small" center style={{ marginTop: space.md, fontSize: 12 }}>It stays on this phone. {d.from ?? 'Your friend'} won’t see your progress unless you share it.</T>
    </Screen>
  );
}
