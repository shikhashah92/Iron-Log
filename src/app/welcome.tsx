import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore, useTheme } from '../store';
import { useBackup } from '../backupActions';
import { addDays, GENDERS, newLog, putProfile, today, type Gender } from '../model';
import { DateField } from '../DateField';
import { isAndroid, isIOS, isStandalone, useInstall } from '../pwa';
import { InstallSteps } from '../components';
import { BrandMark, Button, Choice, Field, Gap, IconButton, MAX_WIDTH, Screen, T } from '../ui';
import { font, radius, space } from '../theme';

type Step = 'install' | 'name' | 'born' | 'gender';
const QUESTIONS: Step[] = ['name', 'born', 'gender'];
const SKIP_INSTALL = 'uplift.skipInstall';
const skipped = () => { try { return localStorage.getItem(SKIP_INSTALL) === '1'; } catch { return false; } };

/**
 * First run. In a phone's browser, installing comes first: on iPhone the Home Screen app keeps its own storage, so
 * anything set up in Safari would be left behind. Then three questions, one at a time: a name (the only one needed),
 * date of birth and gender (both skippable). Everything stays on this device.
 */
export default function Welcome() {
  const { start } = useStore();
  const { restore, modal } = useBackup();
  const { c } = useTheme();
  const { canInstall, install } = useInstall();
  const phoneBrowser = (isIOS() || isAndroid()) && !isStandalone();
  const [step, setStep] = useState<Step>(phoneBrowser && !skipped() ? 'install' : 'name');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false);

  // Each step slides in from the right and fades up (a quick, springy settle).
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: false, damping: 18, stiffness: 160, mass: 0.8 }).start();
  }, [step, enter]);
  const anim = { flex: 1, opacity: enter, transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] };

  async function finish(gender?: Gender) {
    if (busy) return;
    setBusy(true);
    const fresh = newLog(name.trim().slice(0, 40));
    const log = { ...putProfile(fresh, fresh.profiles[0].id, { dob: dob || undefined, gender }), settings: { ...fresh.settings, setupPending: true as const } };
    try { await start({ log, images: {} }); } finally { setBusy(false); }
  }
  const inBrowser = () => { try { localStorage.setItem(SKIP_INSTALL, '1'); } catch { /* private mode: just go on */ } setStep('name'); };

  if (step === 'install') {
    // Mint, full screen: the one thing to do first. Graphite on mint, never white (brand rule).
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.brand }}>
        <Animated.ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }} style={{ opacity: enter }}>
          <Gap h={space.xl} />
          <Image source={{ uri: 'brand/mark-black.svg' }} style={{ width: 72, height: 72 }} accessibilityIgnoresInvertColors />
          <Gap h={space.lg} />
          <T style={{ color: '#1D2125', fontSize: 14, fontWeight: '700' }}>Step 1 · before anything else</T>
          <T v="h1" color="#1D2125" style={{ fontSize: 36, lineHeight: 40, marginTop: space.xs }}>Add Uplift to your Home Screen</T>
          <Gap h={space.md} />
          <T style={{ color: '#1D2125', fontSize: 18, lineHeight: 26 }}>
            It then opens full screen like an app, works offline at the gym, and keeps your log safe.
            {isIOS() ? ' On iPhone the Home Screen app has its own storage, so start there: what you set up here in Safari stays in Safari.' : ''}
          </T>
          <Gap />
          {canInstall && (
            <>
              <Button title="Install Uplift" icon="download-outline" kind="ink" onPress={install} />
              <T center style={{ color: '#1D2125', fontSize: 14, marginVertical: space.sm }}>or add it by hand:</T>
            </>
          )}
          <InstallSteps />
          <Gap h={space.lg} />
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', backgroundColor: 'rgba(29,33,37,0.08)', borderRadius: radius.md, padding: space.md }}>
            <Ionicons name="lock-closed" size={18} color="#1D2125" />
            <T style={{ flex: 1, color: '#1D2125', fontSize: 14 }}>No account, no sign-up. Everything you log stays on your phone.</T>
          </View>
          <Gap h={space.lg} />
          <Pressable accessibilityRole="button" onPress={inBrowser} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.md }}>
            <T style={{ color: '#1D2125', fontWeight: '600', textDecorationLine: 'underline' }}>Continue in the browser instead</T>
          </Pressable>
          <T center style={{ color: '#1D2125', fontSize: 12, opacity: 0.75 }}>You can add it to your Home Screen later from Settings.</T>
        </Animated.ScrollView>
        {modal}
      </SafeAreaView>
    );
  }

  const i = QUESTIONS.indexOf(step);
  const back = () => setStep(i > 0 ? QUESTIONS[i - 1] : 'install');
  const Q = { name: 'What should we call you?', born: 'When were you born?', gender: 'How do you identify?' }[step];
  const hint = {
    name: 'Just a first name is fine. It’s only ever shown to you.',
    born: 'Optional. Uplift shows your age in Me and keeps it up to date.',
    gender: 'Optional. You can change it any time in Me.',
  }[step];

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Progress: three segments that fill as you go. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.lg, minHeight: 56 }}>
        {i > 0 || phoneBrowser ? <IconButton icon="chevron-back" label="Back" onPress={back} /> : <View style={{ width: 24 }} />}
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: i + 1 }}>
          {QUESTIONS.map((q, k) => <View key={q} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: k <= i ? c.brand : c.chip }} />)}
        </View>
        <T v="small" style={{ width: 40, textAlign: 'right' }}>{i + 1} / 3</T>
      </View>
      <Animated.View style={anim}>
        <Gap h={space.xl} />
        {step === 'name' && <><BrandMark size={30} /><Gap h={space.xl} /></>}
        <T v="h1" style={{ fontSize: font.h1 + 6, lineHeight: font.h1 + 12 }}>{Q}</T>
        <T v="small" style={{ marginTop: space.sm, fontSize: 16 }}>{hint}</T>
        <Gap h={space.xl} />

        {step === 'name' && (
          <>
            <Field placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoFocus accessibilityLabel="Your name"
              onSubmitEditing={() => name.trim() && setStep('born')} style={{ fontSize: 22, minHeight: 60 }} returnKeyType="next" />
            <Gap />
            <Button title="Next" icon="arrow-forward" onPress={() => setStep('born')} disabled={!name.trim()} />
            <Gap h={space.xl} />
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: c.accentSoft, borderRadius: radius.md, padding: space.md }}>
              <Ionicons name="lock-closed-outline" size={20} color={c.accent} style={{ marginTop: 1 }} />
              <T v="small" style={{ flex: 1, color: c.text }}>Only on this phone. No account, no sync, no servers: your details and workouts are never sent anywhere, not even to us.</T>
            </View>
            <Gap h={space.lg} />
            <Button title="Restore from a backup" kind="ghost" onPress={restore} style={{ alignSelf: 'center' }} />
          </>
        )}

        {step === 'born' && (
          <>
            <DateField value={dob} onChange={setDob} min="1900-01-01" max={addDays(today(), -3652)} label="Date of birth" />
            <Gap h={space.xl} />
            <Button title={dob ? 'Next' : 'Skip'} icon={dob ? 'arrow-forward' : undefined} kind={dob ? 'primary' : 'secondary'} onPress={() => setStep('gender')} />
          </>
        )}

        {step === 'gender' && (
          <>
            <View style={{ gap: space.sm }}>
              {GENDERS.map((g) => <Choice key={g.id} label={g.label} disabled={busy} onPress={() => finish(g.id)} />)}
            </View>
            <Gap h={space.lg} />
            <Button title="Skip" kind="secondary" onPress={() => finish()} disabled={busy} />
          </>
        )}
      </Animated.View>
      {modal}
    </Screen>
  );
}
