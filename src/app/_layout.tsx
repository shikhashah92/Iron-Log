import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HANDOFF_KEY, useStore, StoreProvider, useTheme } from '../store';
import { fromLegacy } from '../backup';
import { useBackup } from '../backupActions';
import { today } from '../model';
import { BASE } from '../pwa';
import * as storage from '../storage';
import { confirm, notify, saveFile } from '../io';
import { Button, Gap, Screen, T } from '../ui';
import { DialogHost } from '../dialog';

/** Shown if stored data fails validation: never a dead end, never silently overwritten. */
function Recovery() {
  const { corrupt, erase } = useStore();
  const download = () => saveFile(`ironlog-unreadable-${today()}.json`, corrupt!.raw, 'application/json').catch((e) => notify('Download failed', e.message));
  const fresh = async () => {
    if (await confirm('Start fresh?', 'A copy of the unreadable data is kept on this device. Download it first if you want to keep it safe elsewhere.', 'Start fresh', true)) await erase();
  };
  return (
    <Screen edges={['top', 'bottom']}>
      <Gap h={48} />
      <T v="h1">We couldn’t read your data</T>
      <Gap h={12} />
      <T>Your data is still on this device. Download a copy first. Then start fresh. You can restore a backup afterwards from Settings.</T>
      <Gap h={8} />
      <T v="small">Details: {corrupt!.error}</T>
      <Gap h={24} />
      <Button title="Download my data" icon="download-outline" onPress={download} />
      <Gap h={12} />
      <Button title="Start fresh" kind="secondary" onPress={fresh} />
    </Screen>
  );
}

/**
 * Moving from the old (Firestore) app: legacy/index.html leaves everything it read under HANDOFF_KEY on this same
 * device, then opens this app. Bring it in, then offer to delete the cloud copy so nothing is left online.
 */
function useHandoff() {
  const { ready, corrupt } = useStore();
  const { bringIn } = useBackup();
  const busy = useRef(false);
  useEffect(() => {
    if (!ready || corrupt || busy.current) return;
    busy.current = true;
    (async () => {
      const raw = await storage.getItem(HANDOFF_KEY).catch(() => null);
      if (!raw) return;
      try {
        const next = fromLegacy(raw);
        const done = await bringIn(next, 'Bring in your Iron Log data?', 'Moved to this device', 'Before moving from the old app');
        if (!done) return;
        await storage.removeItem(HANDOFF_KEY);
        if (await confirm('Delete the cloud copy?', 'Your workouts are on this device now. The old app still has a copy in the cloud (Firebase). Delete it so nothing is kept online? Save a backup first if you want an extra copy.', 'Delete cloud copy', true))
          window.location.href = `${BASE}legacy/#wipe`;
      } catch (e) {
        notify('Could not bring your data over', `${(e as Error).message} Nothing was changed; you can try again from the old app.`);
      }
    })().finally(() => { busy.current = false; });
  }, [ready, corrupt]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Root() {
  const { ready, log, corrupt } = useStore();
  const { c, dark } = useTheme();
  useHandoff();
  useEffect(() => {
    document.body.style.backgroundColor = c.bg;
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    // Browser/OS chrome (status bar in the installed app) follows the theme.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', c.bg));
  }, [c.bg, dark]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.accent} /></View>;
  if (corrupt) return <><Recovery /><DialogHost /></>;
  const modal = { presentation: 'modal' as const };
  return (
    <>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!!log}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise" options={modal} />
        <Stack.Screen name="edit-exercise" options={modal} />
        <Stack.Screen name="picker" options={modal} />
        <Stack.Screen name="template" options={modal} />
        <Stack.Screen name="active" options={modal} />
        <Stack.Screen name="edit-workout" options={modal} />
        <Stack.Screen name="profiles" options={modal} />
        <Stack.Screen name="feeling" options={modal} />
        <Stack.Screen name="undo" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="weigh-in" options={modal} />
        <Stack.Screen name="target" options={modal} />
        <Stack.Screen name="weigh-ins" />
        <Stack.Screen name="about" options={modal} />
        <Stack.Screen name="install" options={modal} />
      </Stack.Protected>
      <Stack.Protected guard={!log}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
    <DialogHost />
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
