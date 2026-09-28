import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { daysAgo, duration, getEx, longDate, num, plural, today, volumeOf, type Entry } from '../../model';
import { useLog, useTheme } from '../../store';
import { Empty, ProgressBlock, SetLines, useSaveAsTemplate } from '../../components';
import { Button, Card, Chip, Gap, Header, Screen, Segmented, T } from '../../ui';
import { condensed, space } from '../../theme';

export default function History() {
  const [tab, setTab] = useState<'sessions' | 'progress'>('sessions');
  return (
    <Screen>
      <Header title="History" />
      <Segmented value={tab} onChange={setTab} options={[{ id: 'sessions', label: 'Sessions' }, { id: 'progress', label: 'Progress' }]} />
      <Gap h={space.md} />
      {tab === 'sessions' ? <Sessions /> : <Progress />}
    </Screen>
  );
}

function Sessions() {
  const { v } = useLog();
  const [open, setOpen] = useState<string | null>(today());
  const byDate = new Map<string, Entry[]>();
  for (const e of v.entries) if (e.sets.length) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const dates = [...byDate.keys()].sort().reverse();
  if (!dates.length) return <Card><Empty>No sessions logged yet.</Empty></Card>;
  return dates.map((d) => <Day key={d} date={d} entries={byDate.get(d)!} open={open === d} onToggle={() => setOpen(open === d ? null : d)} />);
}

function Day({ date, entries, open, onToggle }: { date: string; entries: Entry[]; open: boolean; onToggle: () => void }) {
  const { v } = useLog();
  const { c } = useTheme();
  const saveAsTemplate = useSaveAsTemplate();
  const s = v.sessions.get(date);
  const sets = entries.reduce((t, e) => t + e.sets.length, 0);
  const vol = entries.reduce((t, e) => t + volumeOf(e, getEx(v, e.exerciseId), v.profile.bodyweight), 0);
  const ago = daysAgo(date);
  const meta = [plural(entries.length, 'ex'), plural(sets, 'set'), `${num(vol)} kg`,
    ...(s?.startedAt && s.endedAt ? [duration(s.endedAt - s.startedAt)] : []), ...(s?.feeling ? [s.feeling] : [])].join(' · ');
  return (
    <Card style={{ marginBottom: space.sm }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <T style={{ fontFamily: condensed, fontWeight: '600', fontSize: 18, flex: 1 }}>{longDate(date)} <T v="mono" style={{ fontSize: 12 }}>{ago === 0 ? 'today' : `${ago}d ago`}</T></T>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
        </View>
        <T v="mono" style={{ fontSize: 12 }}>{meta}</T>
      </Pressable>
      {open && (
        <>
          <Gap h={space.sm} />
          <SetLines entries={entries} name />
          <Gap h={space.sm} />
          <Button title="Save as a template" icon="star-outline" kind="ghost" style={{ minHeight: 40, alignSelf: 'flex-start', paddingHorizontal: 0 }}
            onPress={() => saveAsTemplate(entries.map((e) => e.exerciseId))} />
        </>
      )}
    </Card>
  );
}

function Progress() {
  const { v } = useLog();
  const logged = [...new Set(v.entries.filter((e) => e.sets.length).map((e) => e.exerciseId))];
  const [pick, setPick] = useState<string | null>(null);
  if (!logged.length) return <Card><Empty>Log a few sessions first, then pick an exercise here to see its progress.</Empty></Card>;
  const id = pick && logged.includes(pick) ? pick : logged[0];
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginBottom: space.md }}>
        {logged.map((x) => <Chip key={x} label={getEx(v, x).name} selected={x === id} onPress={() => setPick(x)} />)}
      </ScrollView>
      <Card>
        <T style={{ fontFamily: condensed, fontWeight: '600', fontSize: 20 }}>{getEx(v, id).name}</T>
        <ProgressBlock v={v} id={id} />
      </Card>
    </>
  );
}
