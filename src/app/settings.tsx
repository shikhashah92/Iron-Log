import { View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { dayKey, num, plural, putProfile, withUnits, type Settings as S, type Theme } from '../model';
import { googleCalendarURL, reminderFile, reminderICS, reminderStart, type WeighEvery } from '../body';
import { useLog, useTheme } from '../store';
import { useBackup } from '../backupActions';
import { defaultStep } from '../fun';
import { clearSnapshots } from '../safety';
import { confirm, menu, notify, saveFile } from '../io';
import { BASE, isAndroid, isIOS, isStandalone, useInstall } from '../pwa';
import { Card, Gap, Header, IconButton, Row, Screen, Segmented, T } from '../ui';
import { goBack } from '../components';
import { startTour } from '../tour';
import { space } from '../theme';

export const SUPPORT_EMAIL = 'hello@getuplift.pro';

const ago = (ms?: number) => {
  if (!ms) return 'Never';
  const d = Math.floor((Date.now() - ms) / 86400_000);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};

/** A repeating weigh-in reminder in the phone's own calendar. */
async function addReminder(every: Exclude<WeighEvery, 'off'>) {
  // iPhone: Safari opens a hosted .ics as "Add to Calendar". Android: Google Calendar, pre-filled. Elsewhere: a file.
  const start = reminderStart(every, new Date());
  if (isIOS()) {
    // The app's own service worker answers this on the phone (starting today); see public/sw.js.
    location.href = new URL(`${BASE}${reminderFile(every)}?day=${dayKey(start).replace(/-/g, '')}`, location.origin).href; // window.open shows a blank sheet in the Home Screen app
    return;
  }
  if (isAndroid()) return void window.open(googleCalendarURL(every, start), '_blank');
  try { await saveFile('uplift-weigh-in.ics', reminderICS(every, start), 'text/calendar'); }
  catch (e) { notify('Could not create the reminder', (e as Error).message); }
}

export default function Settings() {
  async function progression() {
    const steps = v.unit === 'lb' ? [2.5, 5, 10] : [1.25, 2.5, 5];
    const pick = await menu('Weight suggestions', [...steps.map((n) => ({ label: `On, ${num(n)} ${v.unit} steps${n === defaultStep(v.unit) ? ' (usual)' : ''}` })), { label: 'Off' }]);
    if (pick === null) return;
    update((l) => putProfile(l, v.profile.id, { progression: pick < steps.length ? { step: steps[pick] } : { off: true } }));
  }
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

  const units = s.units ?? { weight: 'kg', length: 'cm' };
  const every: WeighEvery = v.profile.weighEvery ?? '3x';
  async function weighIns() {
    const opts: [WeighEvery, string][] = [['daily', 'Daily'], ['3x', '3 times a week'], ['weekly', 'Weekly'], ['off', 'Off']];
    const pick = await menu('Weigh-in reminder', opts.map(([id, label]) => ({ label: id === every ? `${label} (now)` : label })));
    if (pick === null) return;
    const weighEvery = opts[pick][0];
    update((l) => putProfile(l, v.profile.id, { weighEvery }));
    // Home shows "Weigh-in due"; a calendar event is what actually notifies.
    if (weighEvery !== 'off' && await confirm('Add it to your calendar?', 'Uplift shows “Weigh-in due” on Home. A repeating calendar event gets you a notification too.', 'Add to calendar')) addReminder(weighEvery);
  }
  async function moreBackup() {
    const pick = await menu('More options', [{ label: 'Save an unlocked backup (readable by anyone with the file)' }, { label: 'Check a backup file opens' }, { label: 'Export as spreadsheet (CSV)' }]);
    if (pick === 0) backup.exportPlain(); else if (pick === 1) backup.verify(); else if (pick === 2) backup.exportCSV();
  }
  async function moveIn() {
    const pick = await menu('Move from another app', [{ label: 'Import a Strong CSV export' }, { label: 'Another app or a spreadsheet: email us' }]);
    if (pick === 0) backup.importFromStrong();
    else if (pick === 1) window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Moving my workouts to Uplift')}`;
  }
  const privacy = () => notify('Everything stays on this phone',
    'Uplift has no account and no server. Your details, workouts, weigh-ins and photos are saved only in this browser on this device. Nothing is synced or uploaded, and there are no ads, analytics or trackers, so nobody else (us included) can see your data.\n\n'
    + 'It only leaves the phone when you choose to: a backup file you save, a CSV you export, or an email you send us. Locked backups are encrypted with your passphrase. Clearing this browser’s site data deletes it, so keep a backup.');
  const label = (t: string) => <T v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>{t}</T>;
  const card = { paddingHorizontal: space.lg };

  return (
    <Screen>
      <Header title="Settings" left={<IconButton icon="chevron-back" label="Back" onPress={goBack} />} />
      {label('Workouts')}
      <Card style={{ gap: space.sm }}>
        <T style={{ fontWeight: '600' }}>Rest timer</T>
        <Segmented<string> value={String(s.restSecs)} onChange={(x) => setSettings({ restSecs: Number(x) })} options={[
          { id: '0', label: 'Off' }, { id: '60', label: '1:00' }, { id: '90', label: '1:30' }, { id: '120', label: '2:00' }, { id: '180', label: '3:00' },
        ]} />
        <T v="small">Starts when you tick a set as done.</T>
        <T style={{ fontWeight: '600', marginTop: space.sm }}>Units</T>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}><Segmented value={units.weight} onChange={(weight) => update((l) => withUnits(l, { ...units, weight }))} options={[{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }]} /></View>
          <View style={{ flex: 1 }}><Segmented value={units.length} onChange={(length) => update((l) => withUnits(l, { ...units, length }))} options={[{ id: 'cm', label: 'cm' }, { id: 'in', label: 'ft / in' }]} /></View>
        </View>
        <T v="small">Everywhere in the app: lifts, plates and body weight.</T>
        <Row left={icon('trending-up')} title="Weight suggestions" subtitle={v.profile.progression?.off ? 'Off' : `“Beat last time”, going up ${num(v.profile.progression?.step ?? defaultStep(v.unit))} ${v.unit} at a time`} right={chevron} onPress={progression} last />
      </Card>
      {label('Reminders')}
      <Card pad={false} style={card}>
        <Row left={icon('calendar-outline')} title="Training days" subtitle={v.profile.trainDays?.length ? `${v.profile.trainDays.map((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')} at ${v.profile.trainTime ?? '07:00'}` : 'Your training days in your own calendar'} right={chevron} onPress={() => router.push('/training')} />
        <Row left={icon('scale-outline')} title="Weigh-ins" subtitle={{ daily: 'Daily', '3x': '3 times a week', weekly: 'Weekly', off: 'Off' }[every]} right={chevron} onPress={weighIns} last />
      </Card>
      {label('Your data')}
      <Card pad={false} style={card}>
        <Row left={icon('shield-checkmark-outline')} title="Back up now" subtitle={`A locked file, encrypted with your passphrase. Last backup: ${ago(s.lastBackupAt)}`} right={chevron} onPress={backup.exportLocked} />
        <Row left={icon('cloud-download-outline')} title="Restore from a backup" subtitle="Replace what’s here with a backup file" right={chevron} onPress={backup.restore} />
        <Row left={icon('time-outline')} title="Undo history" subtitle="Go back to an earlier version (last 10)" right={chevron} onPress={() => router.push('/undo')} />
        <Row left={icon('ellipsis-horizontal')} title="More options" subtitle="Unlocked backup, check a file, spreadsheet export" right={chevron} onPress={moreBackup} last />
      </Card>
      <Gap h={space.sm} />
      <Card pad={false} style={card}>
        <Row left={icon('swap-horizontal-outline')} title="Move from another app" subtitle="Import from Strong, or we’ll help with anything else" right={chevron} onPress={moveIn} last />
      </Card>
      <T v="small" style={{ lineHeight: 20, marginTop: space.sm }}>
        Your data lives only on this device{s.backupChoice === 'local' ? ', and you chose not to keep a copy elsewhere' : ''}. To use another phone, back up here and restore there.
      </T>
      {label('App')}
      <Card style={{ gap: space.sm }}>
        <T style={{ fontWeight: '600' }}>Appearance</T>
        <Segmented<Theme> value={s.theme} onChange={(theme) => setSettings({ theme })} options={[
          { id: 'system', label: 'Automatic' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' },
        ]} />
        <Row left={icon('people-outline')} title="Profiles" subtitle={`Logging as ${v.profile.name} · ${plural(log.profiles.length, 'profile')} on this device`} right={chevron} onPress={() => router.push('/profiles')}
          last={!(!isStandalone() && (canInstall || isIOS() || isAndroid()))} />
        {!isStandalone() && (canInstall || isIOS() || isAndroid()) ? (canInstall
          ? <Row left={icon('download-outline')} title="Install Uplift" subtitle="Opens like an app, works offline" right={chevron} onPress={install} last />
          : <Row left={icon('share-outline')} title="Add to Home Screen" subtitle="Step-by-step for your phone. Keeps your data safer." right={chevron} onPress={() => router.push('/install')} last />) : null}
      </Card>
      {label('Help')}
      <Card pad={false} style={card}>
        <Row left={icon('sparkles-outline')} title="What’s new" subtitle="Every change to Uplift, newest first" right={chevron} onPress={() => router.push('/whats-new')} />
        <Row left={icon('map-outline')} title="App tour" subtitle="A quick walk through each screen" right={chevron} onPress={() => { goBack(); startTour(); }} />
        <Row left={icon('lock-closed-outline')} title="Privacy" subtitle="Everything stays on this phone" right={chevron} onPress={privacy} />
        <Row left={icon('mail-outline')} title="Contact support" subtitle={`Questions, bugs or ideas: ${SUPPORT_EMAIL}`} right={chevron} onPress={contact} last />
      </Card>
      <Gap />
      <Card pad={false} style={card}>
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
