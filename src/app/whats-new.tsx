import { useEffect } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { dateWithYear } from '../model';
import { LATEST, RELEASES, type ChangeKind } from '../whatsNew';
import { useLog, useTheme } from '../store';
import { goBack } from '../components';
import { Header, IconButton, Screen, T } from '../ui';
import { radius, sans, space } from '../theme';

const RAIL = 28; // the timeline's column: a line down the middle, a dot per release

/** Every release as a timeline, newest first: a dot and date per release, a card per change. */
export default function WhatsNew() {
  const { c } = useTheme();
  const { update } = useLog();
  useEffect(() => { update((l) => (l.settings.newsSeen === LATEST ? l : { ...l, settings: { ...l.settings, newsSeen: LATEST } })); }, [update]);
  const KIND: Record<ChangeKind, { label: string; bg: string; fg: string }> = {
    new: { label: 'New', bg: c.brand, fg: c.onAccent },
    better: { label: 'Better', bg: c.accentSoft, fg: c.accent },
    fixed: { label: 'Fixed', bg: c.warnBg, fg: c.warnText },
  };
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="What’s new" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T v="small" style={{ marginBottom: space.lg }}>Everything that’s changed in Uplift, newest first.</T>
      {RELEASES.map((r, i) => {
        const latest = i === 0, last = i === RELEASES.length - 1;
        return (
          <View key={r.date} style={{ flexDirection: 'row' }}>
            {/* The rail: a dot for the release, and the line on to the next one. */}
            <View style={{ width: RAIL, alignItems: 'center' }}>
              <View style={{ width: latest ? 18 : 12, height: latest ? 18 : 12, borderRadius: 9, marginTop: latest ? 2 : 5, backgroundColor: latest ? c.brand : c.card,
                borderWidth: latest ? 4 : 2, borderColor: latest ? c.accentSoft : c.accent }} />
              {!last && <View style={{ flex: 1, width: 2, backgroundColor: c.border, marginTop: 4 }} />}
            </View>
            <View style={{ flex: 1, paddingLeft: space.sm, paddingBottom: last ? 0 : space.xl }} accessibilityRole="summary">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                <T v="label" color={c.accent}>{dateWithYear(r.date)}</T>
                {latest && <View style={{ backgroundColor: c.brand, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 }}>
                  <T style={{ fontSize: 11, fontWeight: '700', color: c.onAccent }}>Latest</T>
                </View>}
              </View>
              <T style={{ fontFamily: sans, fontWeight: '700', fontSize: latest ? 24 : 20, marginTop: 2, marginBottom: space.sm }}>{r.title}</T>
              <View style={{ gap: space.sm }}>
                {r.changes.map((ch) => {
                  const k = KIND[ch.kind];
                  return (
                    <View key={ch.title} style={{ flexDirection: 'row', gap: space.md, backgroundColor: c.card, borderRadius: radius.md, padding: space.md,
                      borderWidth: 1, borderColor: latest && ch.kind === 'new' ? c.brand : c.border }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft }}>
                        <Ionicons name={ch.icon} size={20} color={c.accent} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ alignSelf: 'flex-start', backgroundColor: k.bg, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 }}>
                          <T style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: k.fg }}>{k.label}</T>
                        </View>
                        <T style={{ fontWeight: '600' }}>{ch.title}</T>
                        <T v="small" style={{ color: c.text, opacity: 0.85 }}>{ch.text}</T>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}
