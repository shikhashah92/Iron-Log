// App-specific building blocks shared by screens.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import {
  addDays, clock, dateWithYear, duration, estOneRM, isTimed, fmtSet, getEx, hasArt, historyOf, plural, today, isCustom, isFav, lastEntry, longDate, newId, num, putTemplate, shortDate, toggleFav, topLoad,
  type Entry, type Exercise, type TemplateExercise, type View as LogView,
} from './model';
import { ask } from './io';
import { useLog, useTheme } from './store';
import { adjustRest, stopRest, useNow, useRest } from './timer';
import { Button, Card, Field, Gap, MAX_WIDTH, Segmented, T } from './ui';
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
  return async (exercises: TemplateExercise[], suggested = '') => {
    if (!exercises.length) return;
    const name = await ask('Name this template (e.g. Leg Day)', suggested);
    if (name) update((l) => putTemplate(l, { id: newId('t'), name: name.slice(0, 60), exercises }));
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

const REDUCED_MOTION = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * An exercise's drawing: three poses, looped like a GIF when `animate` (still when the phone asks for reduced motion).
 * The SVGs are single-colour shapes used as a mask, so they take the theme's ink in light and dark mode. The paths are
 * relative: every route is one level deep, so they resolve under the app's folder (e.g. /Iron-Log/illustrations/).
 */
/** `label` for screen readers; without one the drawing is decorative (e.g. next to the name in a list). */
export function Illustration({ id, size, animate = false, label }: { id: string; size: number; animate?: boolean; label?: string }) {
  const { c } = useTheme();
  const [frame, setFrame] = useState(1);
  const moving = animate && !REDUCED_MOTION;
  useEffect(() => {
    if (!moving) return;
    const t = setInterval(() => setFrame((n) => (n % 3) + 1), 700);
    return () => clearInterval(t);
  }, [moving]);
  if (!hasArt(id)) return null;
  const layer = (n: number): CSSProperties => {
    const url = `url(illustrations/${id}/${n}.svg)`;
    return { position: 'absolute', inset: 0, backgroundColor: c.text, opacity: n === (moving ? frame : 1) ? 1 : 0,
      WebkitMaskImage: url, maskImage: url, WebkitMaskSize: 'contain', maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' };
  };
  // All three frames stay mounted while looping, so switching never waits on a download (no flicker).
  return (
    <div role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {(moving ? [1, 2, 3] : [1]).map((n) => <div key={n} style={layer(n)} />)}
    </div>
  );
}

/** An exercise's picture: its drawing, or (for activities without one) its icon in a soft circle. */
export function ExArt({ id, size, animate, label }: { id: string; size: number; animate?: boolean; label?: string }) {
  const { v } = useLog();
  const { c } = useTheme();
  if (hasArt(id)) return <Illustration id={id} size={size} animate={animate} label={label} />;
  const icon = getEx(v, id).icon;
  if (!icon) return null;
  return (
    <View accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={Math.round(size * 0.5)} color={c.accent} />
    </View>
  );
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
/** `right` sits inside the tap area; the star and `actions` are buttons of their own, so they sit beside it (no nested buttons). */
export function ExRow({ ex, right, actions, onPress, star = true, last }: {
  ex: Exercise; right?: ReactNode; actions?: ReactNode; onPress?: () => void; star?: boolean; last?: boolean;
}) {
  const { v, photo } = useLog();
  const { c } = useTheme();
  const prev = lastEntry(v, ex.id);
  const best = prev ? fmtSet(prev.sets.reduce((a, b) => (b.w > a.w || (b.w === a.w && b.r > a.r) ? b : a)), ex) : null;
  return (
    <View style={[st.rowWrap, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
    {star && <Star id={ex.id} />}
    <Pressable accessibilityRole="button" accessibilityLabel={ex.name} onPress={onPress ?? (() => openExercise(ex.id))}
      style={({ pressed }) => [st.row, { flex: 1 }, pressed && { opacity: 0.6 }]}>
      {photo(ex.id) ? <Thumb uri={photo(ex.id)} /> : hasArt(ex.id) ? (
        <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Illustration id={ex.id} size={40} />
        </View>
      ) : ex.icon ? <ExArt id={ex.id} size={44} /> : null}
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
    {actions}
    </View>
  );
}

/** The last 12 sessions' top load as a tiny line. Nothing until there are two. */
export function Spark({ id }: { id: string }) {
  const { v } = useLog();
  const { c } = useTheme();
  const ex = getEx(v, id);
  const pts = historyOf(v, id).map((e) => topLoad(e, ex, v.bodyweight)).filter((x) => x > 0).slice(-12);
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

export type Range = '3m' | '1y' | 'all';
export const RANGES: { id: Range; label: string }[] = [{ id: '3m', label: '3M' }, { id: '1y', label: '1Y' }, { id: 'all', label: 'All' }];
/** First day in the range (inclusive), or '' for all time. */
export const rangeStart = (r: Range, today: string) => (r === 'all' ? '' : addDays(today, r === '3m' ? -91 : -365));
export const rangeLabel = (r: Range) => (r === '3m' ? 'Last 3 months' : r === '1y' ? 'Last 12 months' : 'All time');
const dayMs = (d: string) => new Date(`${d}T12:00:00`).getTime();

export interface ChartSeries { points: { date: string; v: number }[]; style: 'dots' | 'line' | 'dash'; color?: string; label?: string }
/**
 * Values over real time: the x-axis is dates (a long break shows as a gap), labelled with years. Several series share
 * the axes (e.g. weigh-in dots, the trend line, the planned curve); `band` shades a y-range (e.g. healthy BMI weights).
 */
export function TimeChart({ series, band, unit = '', empty = 'Nothing logged in this range.' }: {
  series: ChartSeries[]; band?: { lo: number; hi: number }; unit?: string; empty?: string;
}) {
  const { c } = useTheme();
  const all = series.flatMap((s) => s.points);
  // A line needs two different days (one weigh-in plus its own trend point is still one day).
  if (new Set(all.map((p) => p.date)).size < 2) return <T v="small" style={{ fontStyle: 'italic', marginVertical: space.sm }}>{all.length ? 'Log this on at least two days to see a trend.' : empty}</T>;
  const W = 320, H = 150, pl = 4, pr = 34, pt = 10, pb = 20;
  const xs = all.map((p) => dayMs(p.date)), vs = all.map((p) => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), span = x1 - x0 || 1;
  const mn = Math.min(...vs), mx = Math.max(...vs), pad = (mx - mn) * 0.12 || Math.max(1, mx * 0.05);
  const lo = mn - pad, hi = mx + pad;
  const X = (d: string) => pl + ((dayMs(d) - x0) / span) * (W - pl - pr);
  const Y = (v: number) => pt + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - pt - pb);
  const text = { fontSize: 9, fill: c.muted, fontFamily: mono };
  const first = all.reduce((m, p) => (p.date < m ? p.date : m), all[0].date), last = all.reduce((m, p) => (p.date > m ? p.date : m), all[0].date);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Chart from ${dateWithYear(first)} to ${dateWithYear(last)}`} style={{ width: '100%', height: 'auto', margin: `${space.sm}px 0` }}>
      {band && band.hi > lo && band.lo < hi && (
        <rect x={pl} width={W - pl - pr} y={Y(Math.min(hi, band.hi))} height={Math.max(0, Y(Math.max(lo, band.lo)) - Y(Math.min(hi, band.hi)))} fill={c.goodSoft} opacity={0.6} />
      )}
      {series.map((s, i) => {
        const pts = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1));
        const color = s.color ?? c.accent;
        if (s.style === 'dots') return <g key={i}>{pts.map((p, j) => <circle key={j} cx={X(p.date)} cy={Y(p.v)} r={2.2} fill={color} opacity={0.55} />)}</g>;
        return <polyline key={i} points={pts.map((p) => `${X(p.date).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke={color}
          strokeWidth={s.style === 'dash' ? 1.5 : 2} strokeDasharray={s.style === 'dash' ? '4 3' : undefined} strokeLinejoin="round" strokeLinecap="round" />;
      })}
      <text x={W - pr + 3} y={Y(mx) + 3} {...text}>{num(mx)}{unit}</text>
      <text x={W - pr + 3} y={Y(mn) + 3} {...text}>{num(mn)}{unit}</text>
      <text x={pl} y={H - 5} {...text}>{dateWithYear(first)}</text>
      <text x={W - pr} y={H - 5} textAnchor="end" {...text}>{dateWithYear(last)}</text>
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

/** Sessions / best / 1RM for a range, the trend over real time, and the latest sessions: exercise page and Progress. */
export function ProgressBlock({ v, id }: { v: LogView; id: string }) {
  const [range, setRange] = useState<Range>('1y');
  const [all, setAll] = useState(false);
  const ex = getEx(v, id);
  const since = rangeStart(range, today());
  const everything = historyOf(v, id);
  const h = everything.filter((e) => e.date >= since);
  const bw = v.bodyweight;
  const series = h.map((e) => ({ date: e.date, v: topLoad(e, ex, bw) })).filter((x) => x.v > 0);
  const best = h.reduce((m, e) => Math.max(m, ...e.sets.filter((x) => x.kind !== 'W').map((x) => x.w)), 0);
  const list = [...everything].reverse();
  const mins = (e: Entry) => e.sets.reduce((t, x) => t + x.r, 0) / 60;
  const km = (e: Entry) => e.sets.reduce((t, x) => t + x.w, 0);
  // Strength: sessions, heaviest, 1RM. Cardio: sessions, longest, fastest pace. Activities: sessions, total and longest time.
  const stats: [string, string | number][] = ex.kind === 'cardio'
    ? [['Sessions', h.length], ['Longest', h.some((e) => km(e) > 0) ? `${num(Math.max(...h.map(km)))} km` : `${Math.round(Math.max(0, ...h.map(mins)))} min`],
      ['Best pace', (() => { const ps = h.filter((e) => km(e) > 0).map((e) => (mins(e) * 60) / km(e)); return ps.length ? clock(Math.min(...ps)) : '—'; })()]]
    : ex.kind === 'activity'
    ? [['Sessions', h.length], ['Total', `${Math.round(h.reduce((t, e) => t + mins(e), 0) / 60 * 10) / 10} h`], ['Longest', `${Math.round(Math.max(0, ...h.map(mins)))} min`]]
    : [['Sessions', h.length], ['Best load', num(best)], ['Est. 1RM', num(estOneRM(h, ex, bw))]];
  return (
    <>
      <Segmented<Range> value={range} onChange={setRange} options={RANGES} />
      <T v="small" style={{ marginTop: space.sm }}>{rangeLabel(range)} · {plural(h.length, 'session')}{h.length < everything.length ? ` (${everything.length} in all)` : ''}</T>
      <View style={{ flexDirection: 'row', gap: space.sm, marginVertical: space.sm }}>
        {stats.map(([k, val]) => <Stat key={k} k={k} v={val} />)}
      </View>
      <TimeChart series={[{ points: series, style: 'line' }, { points: series, style: 'dots' }]} empty={`No sessions in the ${rangeLabel(range).toLowerCase()}.`} />
      {isTimed(ex) ? <T v="small" style={{ fontSize: 13 }}>{ex.kind === 'cardio' ? 'The chart shows distance per session (or minutes when no distance was logged).' : 'The chart shows minutes per session.'}</T> : <T v="small" style={{ fontSize: 13 }}>
        {ex.weightType === 'dumbbell' ? 'Values are per dumbbell. ' : ''}
        {ex.weightType === 'bodyweight' ? (bw ? `Bodyweight ${num(bw)} kg included. ` : 'Log your weight in the Me tab for loaded estimates. ') : ''}
        Est. 1RM uses the Epley formula; warm-ups don’t count.
      </T>}
      <Gap h={space.md} />
      <T v="label">{all ? `All sessions (${list.length})` : `Last ${Math.min(10, list.length)} sessions`}</T>
      <SetLines entries={all ? list : list.slice(0, 10)} />
      {list.length > 10 && <Button title={all ? 'Show fewer' : `Show all ${list.length}`} kind="ghost" onPress={() => setAll(!all)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />}
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
  const { v } = useLog();
  const resting = useRest() !== null; // the rest bar and the workout bar sit where the button would: move up above them
  return (
    <View style={[st.fabWrap, { bottom: 24 + (v.active ? 64 : 0) + (resting ? 72 : 0) }]}>
      <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignItems: 'flex-end', paddingHorizontal: space.lg, pointerEvents: 'box-none' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
          style={({ pressed }) => [st.fab, { backgroundColor: c.accent, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
          <Ionicons name="add" size={32} color={c.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

/** The workout in progress, minimised: a bar above the tab bar. Tap to open it again. */
export function WorkoutBar({ bottom }: { bottom: number }) {
  const { v } = useLog();
  const { c } = useTheme();
  const w = v.active;
  const now = useNow(!!w);
  if (!w) return null;
  return (
    <View style={[st.fabWrap, { bottom, paddingHorizontal: space.lg }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${w.name}, in progress`} onPress={() => router.push('/active')}
        style={({ pressed }) => [st.rest, { backgroundColor: c.accent, borderColor: c.accent, opacity: pressed ? 0.85 : 1 }]}>
        <Ionicons name="chevron-up" size={20} color={c.onAccent} />
        <T numberOfLines={1} style={{ flex: 1, fontFamily: condensed, fontWeight: '700', fontSize: 18, textTransform: 'uppercase' }} color={c.onAccent}>{w.name}</T>
        <T style={{ fontFamily: mono, fontSize: 16 }} color={c.onAccent}>{duration(now - w.startedAt)}</T>
      </Pressable>
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
    <View style={[st.fabWrap, { bottom, paddingHorizontal: space.lg }]}>
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
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', pointerEvents: 'box-none' },
  fab: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' },
  rest: { width: '100%', maxWidth: MAX_WIDTH - 2 * space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm + 2, borderRadius: radius.md, borderWidth: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
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
