// Small shared UI kit. Big type, 48pt targets, one accent colour.
import { useState, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './store';
import { condensed, font, mono, radius, space } from './theme';

export const MAX_WIDTH = 560;

/**
 * Select a number field's text on focus, so typing replaces a pre-filled value instead of mixing with it
 * (62.5 then "65" must be 65, not 62.565). A tap resets the selection right after focus, hence the next tick;
 * selectTextOnFocus alone loses that race on the web.
 */
export const selectAll = (e: { target: unknown }) => {
  const el = e.target as HTMLInputElement;
  const sel = () => { try { el.select(); } catch { /* not a text field */ } };
  sel(); // now, for keys typed straight after focus…
  setTimeout(sel, 0); // …and again after the tap's own selection reset
};

export function Screen({ children, scroll = true, edges = ['top'] }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] }) {
  const { c } = useTheme();
  const inner = <View style={s.inner}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? <ScrollView contentContainerStyle={{ paddingBottom: 180 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}

type TVariant = 'h1' | 'title' | 'body' | 'label' | 'small' | 'big' | 'mono';
export function T({ children, v = 'body', color, style, numberOfLines, center }: {
  children: ReactNode; v?: TVariant; color?: string; style?: TextStyle; numberOfLines?: number; center?: boolean;
}) {
  const { c } = useTheme();
  const base: Record<TVariant, TextStyle> = {
    h1: { fontSize: font.h1, fontWeight: '700', fontFamily: condensed, textTransform: 'uppercase', letterSpacing: 0.5 },
    title: { fontSize: font.title, fontWeight: '600', fontFamily: condensed, letterSpacing: 0.3 },
    body: { fontSize: font.body },
    label: { fontSize: font.small, fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    small: { fontSize: font.small, color: c.muted },
    big: { fontSize: font.big, fontFamily: mono, fontVariant: ['tabular-nums'] },
    mono: { fontSize: font.small, fontFamily: mono, color: c.muted, fontVariant: ['tabular-nums'] },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[{ color: c.text }, base[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, pad = true }: { children: ReactNode; style?: ViewStyle; pad?: boolean }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.card, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }, pad && { padding: space.lg }, style]}>{children}</View>;
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'ghost'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; style?: ViewStyle;
}) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.chip, danger: 'transparent', ghost: 'transparent' }[kind];
  const fg = { primary: c.onAccent, secondary: c.text, danger: c.danger, ghost: c.accent }[kind];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'danger' && { borderWidth: 1, borderColor: c.danger }, style]}>
      {icon && <Ionicons name={icon} size={20} color={fg} />}
      <Text style={[{ color: fg, fontSize: font.body, fontWeight: '600' },
        kind === 'primary' && { fontFamily: condensed, fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.6 }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 24, color }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; size?: number; color?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed }) => [s.iconBtn, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

export function Field({ label, style, onFocus, onBlur, ...props }: TextInputProps & { label?: string; ref?: Ref<TextInput> }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false); // brand-coloured focus instead of Safari's default blue ring
  return (
    <View style={{ gap: space.xs }}>
      {label && <T v="label">{label}</T>}
      <TextInput placeholderTextColor={c.muted} accessibilityLabel={label} {...props}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[s.field, { color: c.text, backgroundColor: c.field, borderColor: focused ? c.accent : c.fieldBorder, outlineWidth: 0 }, style]} />
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [s.chip, { backgroundColor: selected ? c.accent : c.chip, opacity: pressed ? 0.8 : 1 }]}>
      {icon ? <Ionicons name={icon as IconName} size={18} color={selected ? c.onAccent : c.accent} /> : null}
      <Text style={{ color: selected ? c.onAccent : c.text, fontSize: 16, fontWeight: selected ? '600' : '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<K extends string>({ value, options, onChange }: { value: K; options: { id: K; label: string }[]; onChange: (k: K) => void }) {
  const { c } = useTheme();
  return (
    <View style={[s.seg, { backgroundColor: c.chip }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.id)}
            style={[s.segItem, on && { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
            <Text style={{ color: on ? c.text : c.muted, fontSize: 16, fontWeight: on ? '700' : '500' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ left, title, subtitle, right, onPress, last }: {
  left?: ReactNode; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }, pressed && { opacity: 0.6 }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T numberOfLines={1} style={{ fontWeight: '500' }}>{title}</T>
        {subtitle ? <T v="small" numberOfLines={1}>{subtitle}</T> : null}
      </View>
      {right}
    </Pressable>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

/** Round icon: one accent colour on a soft tint, so lists stay calm. */
export function Badge({ icon, size = 40 }: { icon: string; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon as IconName} size={Math.round(size * 0.5)} color={c.accent} />
    </View>
  );
}

/** The Iron Log wordmark: "IRON" in rust, "LOG" in ink. */
export function BrandMark({ size = 28 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Text accessibilityRole="header" style={{ fontFamily: condensed, fontWeight: '700', fontSize: size, textTransform: 'uppercase', letterSpacing: 0.5, color: c.text }}>
      <Text style={{ color: c.accent }}>Iron</Text> Log
    </Text>
  );
}

export function Header({ title, right, left }: { title: string; right?: ReactNode; left?: ReactNode }) {
  return (
    <View style={s.header}>
      {left}
      <T v="h1" style={{ flex: 1 }} numberOfLines={1}>{title}</T>
      {right}
    </View>
  );
}

export function Banner({ text, action, onPress, tone = 'warn' }: { text: string; action?: string; onPress?: () => void; tone?: 'warn' | 'error' }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="alert" style={[s.banner, { backgroundColor: tone === 'error' ? c.accentSoft : c.warnBg }]}>
      <T style={{ flex: 1, color: tone === 'error' ? c.danger : c.warnText, fontSize: 15 }}>{text}</T>
      {action && onPress ? <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}><T style={{ fontWeight: '700', color: tone === 'error' ? c.danger : c.warnText, fontSize: 15 }}>{action}</T></Pressable> : null}
    </View>
  );
}

export function Gap({ h = space.lg }: { h?: number }) { return <View style={{ height: h }} />; }

const s = StyleSheet.create({
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg },
  btn: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  iconBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  field: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: font.body },
  chip: { minHeight: 44, paddingHorizontal: space.lg, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6 },
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segItem: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: space.lg, paddingBottom: space.md, gap: space.sm, minHeight: 64 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
});
