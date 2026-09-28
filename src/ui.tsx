// Small shared UI kit. Big type, 48pt targets, one accent colour.
import { useState, type ReactNode, type Ref } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './store';
import { sans, font, radius, space } from './theme';

export const MAX_WIDTH = 560;

/**
 * Select a number field's text on focus, so typing replaces a pre-filled value instead of mixing with it
 * (62.5 then "65" must be 65, not 62.565). A tap resets the selection after focus, hence the next tick and the tap's end;
 * selectTextOnFocus alone loses that race on the web.
 */
export const selectAll = (e: { target: unknown }) => {
  const el = e.target as HTMLInputElement;
  const sel = () => { try { el.select(); } catch { /* not a text field */ } };
  sel(); // now, for keys typed straight after focus…
  setTimeout(sel, 0); // …again after the tap's own selection reset…
  // …and once more when the tap actually ends (a slow tap lifts well after the next tick and drops the caret mid-number).
  const up = () => setTimeout(sel, 0);
  el.addEventListener?.('pointerup', up, { once: true });
  setTimeout(() => el.removeEventListener?.('pointerup', up), 1000);
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
    h1: { fontSize: font.h1, fontWeight: '800', letterSpacing: -0.02 * font.h1 },
    title: { fontSize: font.title, fontWeight: '700', letterSpacing: -0.02 * font.title },
    body: { fontSize: font.body },
    label: { fontSize: font.small, fontWeight: '600', color: c.muted },
    small: { fontSize: font.small, color: c.muted },
    big: { fontSize: font.big, fontWeight: '800', letterSpacing: -0.035 * font.big },
    mono: { fontSize: font.small, color: c.muted },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[{ color: c.text, fontFamily: sans, fontVariant: ['tabular-nums'] }, base[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>
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
  const bg = { primary: c.brand, secondary: c.chip, danger: 'transparent', ghost: 'transparent' }[kind];
  const fg = { primary: c.onAccent, secondary: c.text, danger: c.danger, ghost: c.accent }[kind];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'danger' && { borderWidth: 1, borderColor: c.danger }, style]}>
      {icon && <Ionicons name={icon} size={20} color={fg} />}
      <Text style={{ color: fg, fontSize: font.body, fontWeight: '600', fontFamily: sans }}>{title}</Text>
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
        style={[s.field, { fontFamily: sans, color: c.text, backgroundColor: c.field, borderColor: focused ? c.accent : c.fieldBorder, outlineWidth: 0 }, style]} />
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [s.chip, { backgroundColor: selected ? c.brand : c.chip, opacity: pressed ? 0.8 : 1 }]}>
      {icon ? <Ionicons name={icon as IconName} size={18} color={selected ? c.onAccent : c.accent} /> : null}
      <Text style={{ fontFamily: sans, color: selected ? c.onAccent : c.text, fontSize: 16, fontWeight: selected ? '600' : '500' }}>{label}</Text>
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
            style={[s.segItem, on && { backgroundColor: c.brand }]}>
            {/* One line, whatever the width: the choice reads as a single chip, and the chosen one is in the accent colour. */}
            <Text numberOfLines={1} style={{ fontFamily: sans, color: on ? c.onAccent : c.text, fontSize: 15, fontWeight: on ? '700' : '500' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A list row. `right` is shown inside the tap area (a chevron, a label); `actions` are buttons of their own, so they sit
 * beside it: a button inside a button is invalid HTML and can swallow taps.
 */
export function Row({ left, title, subtitle, right, actions, onPress, last }: {
  left?: ReactNode; title: string; subtitle?: string; right?: ReactNode; actions?: ReactNode; onPress?: () => void; last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={[s.rowWrap, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
        style={({ pressed }) => [s.row, { flex: 1 }, pressed && { opacity: 0.6 }]}>
        {left}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T numberOfLines={1} style={{ fontWeight: '500' }}>{title}</T>
          {subtitle ? <T v="small" numberOfLines={1}>{subtitle}</T> : null}
        </View>
        {right}
      </Pressable>
      {actions}
    </View>
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

/**
 * The Uplift logo: the mark (a U holding the bar) and the wordmark, "up" in ink and "lift" in mint (Archivo 800,
 * tracking -0.035em). The reversed mark on dark. Image paths are relative: every route is one level deep.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  const { c, dark } = useTheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Uplift" style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
      <Image source={{ uri: dark ? 'brand/mark-reversed.svg' : 'brand/mark.svg' }} style={{ width: size * 1.35, height: size * 1.35 }} />
      <Text style={{ fontFamily: sans, fontWeight: '800', fontSize: size, letterSpacing: -0.035 * size, color: c.text }}>
        up<Text style={{ color: c.accent }}>lift</Text>
      </Text>
    </View>
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
  btn: { minHeight: 52, borderRadius: radius.pill, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  iconBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  field: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: font.body },
  chip: { minHeight: 44, paddingHorizontal: space.lg, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6 },
  seg: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segItem: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 4, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: space.lg, paddingBottom: space.md, gap: space.sm, minHeight: 64 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
});
