import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fmtDur, getEx, longDate, num, plural, today } from '../model';
import { monthName, prevMonth, wrapped } from '../fun';
import { drawWrapped, shareWrapped } from '../share';
import { useLog, useTheme } from '../store';
import { notify } from '../io';
import { Confetti, Empty, goBack, MilestoneCard, Stat } from '../components';
import { Button, Card, Gap, Header, IconButton, Screen, T } from '../ui';
import { radius, sans, space } from '../theme';

/** A month, wrapped (`?month=2026-09`, else last month): the story of it, and a picture to share. */
export default function WrappedScreen() {
  const { month: q } = useLocalSearchParams<{ month?: string }>();
  const { v, update } = useLog();
  const { c } = useTheme();
  const [now] = useState(() => today().slice(0, 7));
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : prevMonth(now);
  const r = wrapped(v, month);
  const [blob, setBlob] = useState<Blob | null>(null);
  useEffect(() => {
    let on = true;
    if (r) drawWrapped(v, r).then((b) => { if (on) setBlob(b); }, () => {});
    return () => { on = false; };
  }, [v, r?.month, r?.workouts]); // eslint-disable-line react-hooks/exhaustive-deps
  // Seen: the Home card for this month goes away.
  useEffect(() => { update((l) => (l.settings.wrappedSeen === month ? l : { ...l, settings: { ...l.settings, wrappedSeen: month } })); }, [month, update]);
  if (!r) return <Screen><Header title={`${monthName(month)}, wrapped`} right={<IconButton icon="close" label="Close" onPress={goBack} />} /><Empty>No workouts that month.</Empty></Screen>;
  const share = () => shareWrapped(v, r, blob ?? undefined).catch(() => notify('Couldn’t make the picture', 'Try again in a moment.'));
  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top', 'bottom']}>
        <Header title={`${monthName(month)}, wrapped`} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
        <View style={{ backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: space.lg }}>
          <T style={{ fontFamily: sans, fontWeight: '800', fontSize: 64, lineHeight: 68 }}>{r.workouts}</T>
          <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 20 }}>{r.workouts === 1 ? 'workout' : 'workouts'} on {plural(r.days, 'day')}</T>
        </View>
        <Gap h={space.sm} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Stat k="Time" v={r.minutes ? fmtDur(r.minutes * 60) : '–'} />
          {r.volume ? <Stat k="Lifted" v={r.volume >= 1000 ? `${num(Math.round(r.volume / 100) / 10)}t` : `${num(Math.round(r.volume))} kg`} /> : r.km ? <Stat k="Distance" v={`${num(r.km)} km`} /> : <Stat k="Yoga" v={`${r.yoga}m`} />}
          <Stat k="Bests" v={r.bests} />
        </View>
        <Gap />
        <Card style={{ gap: space.md }}>
          {r.top && <Line k="Most done" v={`${getEx(v, r.top.exerciseId).name} · ${plural(r.top.sets, 'set')}`} />}
          {r.heaviest && <Line k="Heaviest lift" v={`${getEx(v, r.heaviest.exerciseId).name} · ${num(r.heaviest.kg)} kg`} />}
          <Line k="Best week" v={`${plural(r.bestWeek.workouts, 'workout')}, week of ${longDate(r.bestWeek.start)}`} />
          {r.km && r.volume ? <Line k="Distance" v={`${num(r.km)} km`} /> : null}
          {r.yoga ? <Line k="On the mat" v={fmtDur(r.yoga * 60)} /> : null}
        </Card>
        {r.milestones.length ? (
          <>
            <Gap />
            <T v="label">Milestones this month</T>
            <Card pad={false} style={{ paddingHorizontal: space.md, marginTop: space.xs }}>
              {r.milestones.map((x) => <MilestoneCard key={x.id} icon={x.icon} title={x.title} detail={x.detail} />)}
            </Card>
          </>
        ) : null}
        <Gap />
        <Button title="Share my month" icon="share-social-outline" onPress={share} />
        <Gap />
      </Screen>
      <Confetti on />
    </View>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return <View><T v="small">{k}</T><T style={{ fontWeight: '700', fontSize: 17 }}>{v}</T></View>;
}
