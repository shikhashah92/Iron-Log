import { View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { plural, type Settings as S, type Theme } from '../../model';
import { useLog, useTheme } from '../../store';
import { useBackup } from '../../backupActions';
import { clearSnapshots } from '../../safety';
import { confirm, notify } from '../../io';
import { BASE, hadOldApp, isIOS, isStandalone, useInstall } from '../../pwa';
import { Card, Gap, Header, Row, Screen, Segmented, T } from '../../ui';
import { space } from '../../theme';

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

  async function eraseAll() {
    if (!(await confirm('Erase all data?', `This clears every profile, exercise and workout on this device (${plural(log.entries.length, 'logged exercise')}). A copy stays in Undo history, so you can still go back.`, 'Erase', true))) return;
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
      <Header title="Settings" />
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
      <T v="small" style={{ marginTop: space.xs }}>Starts when you enter reps for a set.</T>
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
        <Row left={icon('swap-vertical-outline')} title="Import from Strong" subtitle="Add your history from a Strong CSV export" right={chevron} onPress={backup.importFromStrong} />
        <Row left={icon('time-outline')} title="Undo history" subtitle="Go back to an earlier version (last 10, on this device)" right={chevron} onPress={() => router.push('/undo')} last />
      </Card>
      <Gap h={space.sm} />
      <T v="small" style={{ lineHeight: 20 }}>
        Your data lives only in this browser on this device{s.backupChoice === 'local' ? ', and you chose not to keep a copy elsewhere' : ''}. Iron Log never uploads anything. To use another phone, save a backup here and restore it there.
      </T>
      {hadOldApp() && (
        <>
          <Gap />
          <T v="label">Old Iron Log</T>
          <Gap h={space.sm} />
          <Card pad={false} style={{ paddingHorizontal: space.lg }}>
            <Row left={icon('swap-vertical-outline')} title="Bring data over again" subtitle="From the old app’s cloud copy, if it still exists" right={chevron} onPress={() => { window.location.href = `${BASE}legacy/#move`; }} />
            <Row left={icon('cloud-offline-outline', c.danger)} title="Delete the old cloud copy" subtitle="Removes everything the old app kept in Firebase" right={chevron} onPress={() => { window.location.href = `${BASE}legacy/#wipe`; }} last />
          </Card>
        </>
      )}
      {!isStandalone() && (canInstall || isIOS()) ? (
        <>
          <Gap />
          <T v="label">App</T>
          <Gap h={space.sm} />
          <Card pad={false} style={{ paddingHorizontal: space.lg }}>
            {canInstall
              ? <Row left={icon('download-outline')} title="Install Iron Log" subtitle="Opens like an app, works offline" right={chevron} onPress={install} last />
              : <Row left={icon('share-outline')} title="Add to Home Screen" subtitle="Tap Share, then “Add to Home Screen”. Keeps your data safe in Safari." last />}
          </Card>
        </>
      ) : null}
      <Gap />
      <Card pad={false} style={{ paddingHorizontal: space.lg }}>
        <Row left={icon('trash-outline', c.danger)} title="Erase all data" subtitle="Clear everything here (you can undo it from Undo history)" onPress={eraseAll} last />
      </Card>
      <Gap />
      <T v="small" center>Iron Log {Constants.expoConfig?.version ?? ''} · No account · No ads, no tracking</T>
      <Gap h={space.sm} />
      <T v="small" center style={{ fontSize: 12, lineHeight: 18 }}>
        Exercise illustrations from Workout Guide by Bryl Lim, based on Everkinetic, used under CC BY-SA 4.0.
      </T>
      {backup.modal}
    </Screen>
  );
}
