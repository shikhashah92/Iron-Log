// App-specific building blocks shared by screens.
import { useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import {
  estOneRM, fmtSet, getEx, historyOf, isCustom, isFav, lastEntry, longDate, newId, num, prOf, putTemplate, shortDate, toggleFav, topLoad,
  type Entry, type Exercise, type View as LogView,
} from './model';
import { ask } from './io';
import { useLog, useTheme } from './store';
import { adjustRest, stopRest, useRest } from './timer';
import { Button, Card, Field, Gap, MAX_WIDTH, T } from './ui';
import { condensed, mono, radius, space } from './theme';
import { isIOS } from './pwa';

// iOS Safari offers "Use Strong Password" on any masked field, which would replace the passphrase the person must write
// down with a random one. There it stays visible (easier to copy down correctly, too); elsewhere a normal masked field.
const MASKED = { secureTextEntry: !isIOS(), autoComplete: 'off' as const };

/** Close a modal/stack screen; falls back to Home when opened directly (refresh or deep link on web). */
export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
export const openExercise = (id: string) => router.push({ pathname: '/exercise', params: { id } });

/** Name and save these exercises as a template (from today, or any past day in History). */
export function useSaveAsTemplate() {
  const { update } = useLog();
  return async (ids: string[], suggested = '') => {
    if (!ids.length) return;
    const name = await ask('Name this template (e.g. Leg Day)', suggested);
    if (name) update((l) => putTemplate(l, { id: newId('t'), name: name.slice(0, 60), exerciseIds: ids }));
  };
}

export function Tag({ label, tone }: { label: string; tone?: 'accent' | 'good' }) {
  const { c } = useTheme();
  const fg = tone === 'accent' ? c.accent : tone === 'good' ? c.good : c.muted;
  return (
    <View style={{ borderWidth: 1, borderColor: tone === 'good' ? c.good : tone ? c.accentSoft : c.border, backgroundColor: tone === 'good' ? c.goodSoft : c.chip, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 }}>
      <T style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, color: fg }}>{label}</T>
    </View>
  );
}

export function Stat({ k, v }: { k: string; v: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.chip, borderColor: c.border, borderWidth: 1, borderRadius: 10, padding: space.sm + 2 }}>
      <T v="label" style={{ fontSize: 11 }}>{k}</T>
      <T style={{ fontFamily: mono, fontSize: 20, marginTop: 2 }}>{v}</T>
    </View>
  );
}

export function Thumb({ uri, size = 40 }: { uri?: string; size?: number }) {
  const { c } = useTheme();
  if (!uri) return null;
  return <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.chip }} />;
}

export function Star({ id }: { id: string }) {
  const { v, update } = useLog();
  const { c } = useTheme();
  const on = isFav(v, id);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? 'Remove from favorites' : 'Add to favorites'}
      hitSlop={6} onPress={() => update((l) => toggleFav(l, id))} style={{ minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={on ? 'star' : 'star-outline'} size={22} color={on ? c.accent : c.border} />
    </Pressable>
  );
}

/** One exercise in a list: name, tags, the last time it was done, and a tiny trend line. */
export function ExRow({ ex, right, onPress, star = true, last }: { ex: Exercise; right?: ReactNode; onPress?: () => void; star?: boolean; last?: boolean }) {
  const { v, photo } = useLog();
  const { c } = useTheme();
  const prev = lastEntry(v, ex.id);
  const best = prev ? fmtSet(prev.sets.reduce((a, b) => (b.w > a.w || (b.w === a.w && b.r > a.r) ? b : a)), ex) : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={ex.name} onPress={onPress ?? (() => openExercise(ex.id))}
      style={({ pressed }) => [st.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }, pressed && { opacity: 0.6 }]}>
      {star && <Star id={ex.id} />}
      <Thumb uri={photo(ex.id)} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <T numberOfLines={1} style={{ fontFamily: condensed, fontWeight: '600', fontSize: 18 }}>{ex.name}</T>
        <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
          <Tag label={ex.group} />
          {ex.equip ? <Tag label={ex.equip} /> : null}
          {isCustom(v, ex.id) && <Tag label="Custom" tone="accent" />}
        </View>
      </View>
      {right ?? (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <T v="mono" style={{ fontSize: 12 }}>{prev ? shortDate(prev.date) : 'no log'}</T>
          {best && <T style={{ fontFamily: mono, fontSize: 13 }}>{best}</T>}
          <Spark id={ex.id} />
        </View>
      )}
    </Pressable>
  );
}

/** The last 12 sessions' top load as a tiny line. Nothing until there are two. */
export function Spark({ id }: { id: string }) {
  const { v } = useLog();
  const { c } = useTheme();
  const ex = getEx(v, id);
  const pts = historyOf(v, id).map((e) => topLoad(e, ex, v.profile.bodyweight)).filter((x) => x > 0).slice(-12);
  if (pts.length < 2) return null;
  const w = 70, h = 22, p = 3, mn = Math.min(...pts), rg = Math.max(...pts) - mn || 1;
  const xy = pts.map((val, i) => [p + (i * (w - 2 * p)) / (pts.length - 1), h - p - ((val - mn) / rg) * (h - 2 * p)]);
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={xy.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ')} fill="none" stroke={c.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={1.8} fill={c.accent} />
    </svg>
  );
}

/** Top load per session over time. */
export function LineChart({ series }: { series: { label: string; val: number }[] }) {
  const { c } = useTheme();
  if (series.length < 2) return <T v="small" style={{ fontStyle: 'italic', marginVertical: space.sm }}>Log this exercise at least twice to see a trend.</T>;
  const W = 300, H = 118, pl = 6, pr = 26, pt = 10, pb = 18;
  const vals = series.map((s) => s.val), mn = Math.min(...vals), mx = Math.max(...vals);
  const lo = mn - (mx - mn) * 0.15 || mn * 0.9, hi = mx + (mx - mn) * 0.15 || mx * 1.1 + 1, rg = hi - lo || 1;
  const X = (i: number) => pl + (i * (W - pl - pr)) / (series.length - 1), Y = (val: number) => pt + (1 - (val - lo) / rg) * (H - pt - pb);
  const line = series.map((s, i) => `${X(i).toFixed(1)},${Y(s.val).toFixed(1)}`);
  const area = `M${X(0).toFixed(1)},${H - pb} L${line.join(' L ')} L${X(series.length - 1).toFixed(1)},${H - pb} Z`;
  const text = { fontSize: 9, fill: c.muted, fontFamily: mono };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progress chart" style={{ width: '100%', height: 'auto', margin: `${space.sm}px 0` }}>
      <path d={area} fill={c.accentSoft} opacity={0.55} />
      <polyline points={line.join(' ')} fill="none" stroke={c.accent} strokeWidth={2} strokeLinejoin="round" />
      {series.map((s, i) => <circle key={i} cx={X(i)} cy={Y(s.val)} r={2.4} fill={c.accent} />)}
      <text x={W - pr + 3} y={Y(mx) + 3} {...text}>{num(mx)}</text>
      <text x={W - pr + 3} y={Y(mn) + 3} {...text}>{num(mn)}</text>
      <text x={pl} y={H - 4} {...text}>{series[0].label}</text>
      <text x={W - pr} y={H - 4} textAnchor="end" {...text}>{series[series.length - 1].label}</text>
    </svg>
  );
}

/** One line per day (or per exercise): the label on the left, every set on the right. */
export function SetLines({ entries, name }: { entries: Entry[]; name?: boolean }) {
  const { v } = useLog();
  const { c } = useTheme();
  return entries.map((e) => {
    const ex = getEx(v, e.exerciseId);
    return (
      <View key={`${e.date}-${e.exerciseId}`} style={{ flexDirection: 'row', gap: space.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.border }}>
        <T style={{ flex: 1, fontSize: 15 }}>{name ? ex.name : longDate(e.date)}</T>
        <T v="mono" style={{ flexShrink: 1, textAlign: 'right' }}>{e.sets.map((x) => fmtSet(x, ex)).join('  ')}</T>
      </View>
    );
  });
}

/** Sessions / best / 1RM, the trend, and the last 10 days: used here and on each exercise's page. */
export function ProgressBlock({ v, id }: { v: LogView; id: string }) {
  const ex = getEx(v, id);
  const h = historyOf(v, id);
  const bw = v.profile.bodyweight;
  const series = h.map((e) => ({ label: shortDate(e.date), val: topLoad(e, ex, bw) })).filter((x) => x.val > 0);
  return (
    <>
      <View style={{ flexDirection: 'row', gap: space.sm, marginVertical: space.sm }}>
        <Stat k="Sessions" v={h.length} />
        <Stat k="Best load" v={num(prOf(v, id))} />
        <Stat k="Est. 1RM" v={num(estOneRM(h, ex, bw))} />
      </View>
      <LineChart series={series} />
      <T v="small" style={{ fontSize: 13 }}>
        {ex.weightType === 'dumbbell' ? 'Values are per dumbbell. ' : ''}
        {ex.weightType === 'bodyweight' ? (bw ? `Bodyweight ${num(bw)} kg included. ` : 'Set your bodyweight on Home for loaded estimates. ') : ''}
        Est. 1RM uses the Epley formula.
      </T>
      <Gap h={space.sm} />
      <SetLines entries={[...h].reverse().slice(0, 10)} />
    </>
  );
}

/** A card with an uppercase heading, like the old app's sections. */
export function Section({ title, right, children, pad = true }: { title: string; right?: ReactNode; children: ReactNode; pad?: boolean }) {
  return (
    <Card style={{ marginBottom: space.md }} pad={pad}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs }, !pad && { paddingHorizontal: space.lg, paddingTop: space.lg }]}>
        <T v="label">{title}</T>
        {right}
      </View>
      {children}
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <T v="small" style={{ fontStyle: 'italic', paddingVertical: space.sm }}>{children}</T>;
}

export function AddButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { c } = useTheme();
  const resting = useRest() !== null; // the rest bar sits where the button would: move up above it
  return (
    <View pointerEvents="box-none" style={[st.fabWrap, resting && { bottom: 24 + 72 }]}>
      <View pointerEvents="box-none" style={{ width: '100%', maxWidth: MAX_WIDTH, alignItems: 'flex-end', paddingHorizontal: space.lg }}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
          style={({ pressed }) => [st.fab, { backgroundColor: c.accent, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
          <Ionicons name="add" size={32} color={c.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

/** The rest countdown, floating above the tab bar on every screen while it runs. */
export function RestBar({ bottom = 12 }: { bottom?: number }) {
  const left = useRest();
  const { c } = useTheme();
  if (left === null) return null;
  const done = left <= 0;
  const clock = `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, '0')}`;
  const btn = (label: string, onPress: () => void, a11y: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress}
      style={({ pressed }) => [st.tb, { backgroundColor: c.chip, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
      <T style={{ fontFamily: mono, fontSize: 13 }}>{label}</T>
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={[st.fabWrap, { bottom, paddingHorizontal: space.lg }]}>
      <View accessibilityRole="timer" accessibilityLiveRegion="polite" style={[st.rest, { backgroundColor: c.card, borderColor: c.border }]}>
        <T v="label" style={{ fontSize: 11 }}>{done ? 'Go' : 'Rest'}</T>
        <T style={{ fontFamily: mono, fontSize: 24, minWidth: 64, color: done ? c.good : c.text }}>{clock}</T>
        {btn('−15', () => adjustRest(-15), 'Rest 15 seconds less')}
        {btn('+15', () => adjustRest(15), 'Rest 15 seconds more')}
        <View style={{ flex: 1 }} />
        {btn('Done', stopRest, 'Stop rest timer')}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  fab: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  rest: { width: '100%', maxWidth: MAX_WIDTH - 2 * space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm + 2, borderRadius: radius.md, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  tb: { minWidth: 44, minHeight: 40, paddingHorizontal: space.sm, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

/** Passphrase entry for encrypted backups. mode "set" asks twice and explains that it can't be recovered. */
export function PassphraseModal({ visible, mode, onSubmit, onClose }: {
  visible: boolean; mode: 'set' | 'enter'; onSubmit: (pass: string) => Promise<void>; onClose: () => void;
}) {
  const { c } = useTheme();
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setPass(''); setAgain(''); setError(''); onClose(); };
  async function submit() {
    if (mode === 'set' && pass.trim().length < 10) return setError('Use at least 10 characters. A short sentence works well.');
    if (mode === 'set' && pass !== again) return setError('The two passphrases do not match.');
    if (!pass) return setError('Please enter your passphrase.');
    setBusy(true);
    setError('');
    try {
      await onSubmit(pass);
      setPass(''); setAgain('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-start', padding: space.lg, paddingTop: 72 }}>{/* top-aligned: stays above the keyboard */}
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: c.bg, borderRadius: radius.lg, padding: space.xl, gap: space.md }}>
          <T v="title">{mode === 'set' ? 'Lock this backup' : 'Enter the backup passphrase'}</T>
          <T v="small" style={{ lineHeight: 20 }}>
            {mode === 'set'
              ? 'The backup file is locked with this passphrase on your phone, before you save it anywhere. Nobody else can open it, not even Iron Log. If you forget it, the backup cannot be recovered, so write it down somewhere safe.'
              : 'This backup is locked. Enter the passphrase you chose when you saved it.'}
          </T>
          <Field label="Passphrase" value={pass} onChangeText={(t) => { setPass(t); setError(''); }} {...MASKED} autoFocus
            autoCapitalize="none" autoCorrect={false}
            onSubmitEditing={mode === 'enter' ? submit : undefined} />
          {mode === 'set' && (
            <Field label="Type it again" value={again} onChangeText={(t) => { setAgain(t); setError(''); }} {...MASKED}
              autoCapitalize="none" autoCorrect={false} onSubmitEditing={submit} />
          )}
          {error ? <T color={c.danger} style={{ fontSize: 15 }}>{error}</T> : null}
          <Button title={busy ? (mode === 'set' ? 'Locking…' : 'Opening…') : mode === 'set' ? 'Lock and save' : 'Open backup'} onPress={submit} disabled={busy} />
          <Button title="Cancel" kind="ghost" onPress={close} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}
