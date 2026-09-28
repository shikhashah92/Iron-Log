import { View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { plural, type Settings as S, type Theme } from '../model';
import { useLog, useTheme } from '../store';
import { useBackup } from '../backupActions';
import { clearSnapshots } from '../safety';
import { confirm, notify } from '../io';
import { isAndroid, isIOS, isStandalone, useInstall } from '../pwa';
import { Card, Gap, Header, IconButton, Row, Screen, Segmented, T } from '../ui';
import { goBack } from '../components';
import { startTour } from '../tour';
import { space } from '../theme';

export const SUPPORT_EMAIL = 'shikhashah92@gmail.com';

const ago = (ms?: number) => {
  if (!ms) return 'Never';
  const d = Math.floor((Date.now() - ms) / 86400_000);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};

export default function Settings() {
  const { log, v, update, erase } = useLog();
  const { c } = useTheme();
  const s = log.settings;
  const backup = useBackup();
  const { canInstall, install } = useInstall();
  const chevron = <Ionicons name="chevron-forward" size={20} color={c.muted} />;
  const icon = (name: keyof typeof Ionicons.glyphMap, color = c.accent) => (
    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
  const setSettings = (patch: Partial<S>) => update((l) => ({ ...l, settings: { ...l.settings, ...patch } }));

  function contact() {
    // Only what's typed here goes out, through your own mail app. Nothing from your log is attached.
    const body = `\n\n\n—\nUplift ${Constants.expoConfig?.version ?? ''} · ${navigator.userAgent}`;
    // location, not window.open: an installed iPhone web app hands mailto: to Mail reliably this way, with no blank tab.
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Uplift feedback')}&body=${encodeURIComponent(body)}`;
  }
  async function eraseAll() {
    if (!(await confirm('Erase all data?', `This clears every profile, exercise and workout on this device (${plural(log.workouts.length, 'workout')}). A copy stays in Undo history, so you can still go back.`, 'Erase', true))) return;
    try {
      await erase();
    } catch (e) {
      return notify('Nothing was erased', `Could not save the undo copy first (${(e as Error).message}).`);
    }
    // For a clean slate (e.g. handing over the phone): also remove the undo copies.
    if (await confirm('Also remove history from this device?', 'Deletes Undo history too. Backup files you saved elsewhere are not affected. This cannot be undone.', 'Remove', true))
      await clearSnapshots();
  }

  return (
    <Screen>
      <Header title="Settings" left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} />
      <T v="label">Appearance</T>
      <Gap h={space.sm} />
      <Segmented<Theme> value={s.theme} onChange={(theme) => setSettings({ theme })} options={[
        { id: 'system', label: 'Automatic' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' },
      ]} />
      <Gap />
      <T v="label">Rest timer</T>
      <Gap h={space.sm} />
      <Segmented<string> value={String(s.restSecs)} onChange={(x) => setSettings({ restSecs: Number(x) })} options={[
        { id: '0', label: 'Off' }, { id: '60', label: '1:00' }, { id: '90', label: '1:30' }, { id: '120', label: '2:00' }, { id: '180', label: '3:00' },
      ]} />
      <T v="small" style={{ marginTop: space.xs }}>Starts when you tick a set as done.</T>
      <Gap />
      <T v="label">People</T>
      <Gap h={space.sm} />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={icon('people-outline')} title="Profiles" subtitle={`Logging as ${v.profile.name} · ${plural(log.profiles.length, 'profile')} on this device`} right={chevron} onPress={() => router.push('/profiles')} last />
      </Card>
      <Gap />
      <T v="label">Backup</T>
      <Gap h={space.sm} />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={icon('shield-checkmark-outline')} title="Save a locked backup" subtitle={`Encrypted with your passphrase. Last backup: ${ago(s.lastBackupAt)}`} right={chevron} onPress={backup.exportLocked} />
        <Row left={icon('cloud-upload-outline')} title="Save an unlocked backup" subtitle="Plain file, readable by anyone who has it" right={chevron} onPress={backup.exportPlain} />
        <Row left={icon('document-text-outline')} title="Export as spreadsheet (CSV)" subtitle="One row per set, for Excel or Google Sheets" right={chevron} onPress={backup.exportCSV} />
        <Row left={icon('cloud-download-outline')} title="Restore from backup" subtitle="Replace data with a backup file" right={chevron} onPress={backup.restore} />
        <Row left={icon('swap-vertical-outline')} title="Import from Strong" subtitle="Export a CSV from the Strong workout app’s settings, then pick it here" right={chevron} onPress={backup.importFromStrong} />
        <Row left={icon('mail-outline')} title="Moving from another app?" subtitle="Another app or a spreadsheet? Email us and we’ll help move your history." right={chevron}
          onPress={() => { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Moving my workouts to Uplift')}`; }} />
        <Row left={icon('time-outline')} title="Undo history" subtitle="Go back to an earlier version (last 10, on this device)" right={chevron} onPress={() => router.push('/undo')} last />
      </Card>
      <Gap h={space.sm} />
      <T v="small" style={{ lineHeight: 20 }}>
        Your data lives only in this browser on this device{s.backupChoice === 'local' ? ', and you chose not to keep a copy elsewhere' : ''}. Uplift never uploads anything. To use another phone, save a backup here and restore it there.
      </T>
      {!isStandalone() && (canInstall || isIOS() || isAndroid()) ? (
        <>
          <Gap />
          <T v="label">App</T>
          <Gap h={space.sm} />
          <Card pad={false} style={{ paddingHorizontal: space.lg }}>
            {canInstall
              ? <Row left={icon('download-outline')} title="Install Uplift" subtitle="Opens like an app, works offline" right={chevron} onPress={install} last />
              : <Row left={icon('share-outline')} title="Add to Home Screen" subtitle="Step-by-step for your phone. Keeps your data safer." right={chevron} onPress={() => router.push('/install')} last />}
          </Card>
        </>
      ) : null}
      <Gap />
      <T v="label">Privacy</T>
      <Gap h={space.sm} />
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Ionicons name="lock-closed-outline" size={20} color={c.accent} />
          <T style={{ fontWeight: '600' }}>Everything stays on this phone</T>
        </View>
        <T v="small" style={{ lineHeight: 20 }}>
          Uplift has no account and no server. Your details, workouts, weigh-ins and photos are saved only in this browser on this device. Nothing is synced or uploaded, and there are no ads, analytics or trackers, so nobody else (us included) can see your data.
        </T>
        <T v="small" style={{ lineHeight: 20 }}>
          It only leaves the phone when you choose to: a backup file you save, a CSV you export, or an email you send us. Locked backups are encrypted with your passphrase. Clearing this browser’s site data deletes it, so keep a backup.
        </T>
      </Card>
      <Gap />
      <T v="label">Help</T>
      <Gap h={space.sm} />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={icon('map-outline')} title="App tour" subtitle="A quick walk through each screen" right={chevron} onPress={() => { goBack(); startTour(); }} />
        <Row left={icon('mail-outline')} title="Contact support" subtitle={`Questions, bugs or ideas: ${SUPPORT_EMAIL}`} right={chevron} onPress={contact} last />
      </Card>
      <Gap />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={icon('trash-outline', c.danger)} title="Erase all data" subtitle="Clear everything here (you can undo it from Undo history)" onPress={eraseAll} last />
      </Card>
      <Gap />
      <T v="small" center>Uplift {Constants.expoConfig?.version ?? ''} · No account · No ads, no tracking</T>
      <Gap h={space.sm} />
      <T v="small" center style={{ fontSize: 12, lineHeight: 18 }}>
        Exercise illustrations from Workout Guide by Bryl Lim, based on Everkinetic, used under CC BY-SA 4.0.
      </T>
      {backup.modal}
    </Screen>
  );
}
