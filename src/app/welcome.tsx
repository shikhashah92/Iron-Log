import { useState } from 'react';
import { View } from 'react-native';
import { useStore, useTheme } from '../store';
import { useBackup } from '../backupActions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays, GENDERS, newLog, putProfile, today, type Gender } from '../model';
import { DateField } from '../DateField';
import { isIOS, isStandalone } from '../pwa';
import { InstallSteps } from '../components';
import { BrandMark, Button, Card, Chip, Field, Gap, Screen, T } from '../ui';
import { space } from '../theme';

/** First screen: no sign-up. A few optional details about you (kept on this device), restore a backup, or move from the old app. */
export default function Welcome() {
  const { start } = useStore();
  const { restore, modal } = useBackup();
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<Gender>();
  const [busy, setBusy] = useState(false);
  const [how, setHow] = useState(false);
  // iPhone: the Home Screen app has its own storage, so the best time to add it is before logging anything here.
  const iosBrowser = isIOS() && !isStandalone();

  async function go() {
    setBusy(true);
    const fresh = newLog(name.trim().slice(0, 40) || 'Me');
    const log = { ...putProfile(fresh, fresh.profiles[0].id, { dob: dob || undefined, gender }), settings: { ...fresh.settings, setupPending: true as const } };
    try { await start({ log, images: {} }); } finally { setBusy(false); }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ minHeight: 520, justifyContent: 'center', paddingVertical: space.xxl }}>
        <BrandMark size={44} />
        <Gap h={space.sm} />
        <T style={{ color: c.muted }}>Your training log: lifts, yoga, runs and your progress.</T>
        <Gap h={space.xl} />
        {iosBrowser && (
          <>
            <Card style={{ gap: space.sm }}>
              <T style={{ fontWeight: '600' }}>On iPhone? Add to Home Screen first</T>
              <T v="small">The Home Screen app keeps its own storage, apart from Safari: start there so everything you log is in one place.</T>
              {how ? <InstallSteps /> : <Button title="Show me how" kind="secondary" onPress={() => setHow(true)} />}
            </Card>
            <Gap />
          </>
        )}
        <T v="title">About you</T>
        <T v="small">All optional. It stays on this phone.</T>
        <Gap h={space.md} />
        <Field label="Name" placeholder="Me" value={name} onChangeText={setName} autoCapitalize="words" />
        <Gap h={space.md} />
        <T v="label">Date of birth</T>
        <Gap h={space.xs} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <DateField value={dob} onChange={setDob} min="1900-01-01" max={addDays(today(), -3652)} label="Date of birth" />
          {dob ? <Button title="Clear" kind="ghost" onPress={() => setDob('')} style={{ minHeight: 40, paddingHorizontal: space.sm }} /> : null}
        </View>
        <Gap h={space.md} />
        <T v="label">Gender</T>
        <Gap h={space.xs} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {GENDERS.map((g) => <Chip key={g.id} label={g.label} selected={gender === g.id} onPress={() => setGender(gender === g.id ? undefined : g.id)} />)}
        </View>
        <Gap h={space.lg} />
        <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <Ionicons name="lock-closed-outline" size={22} color={c.accent} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontWeight: '600' }}>Only on this phone</T>
            <T v="small">No account, no sync, no servers. Your details and workouts are saved on this device and never sent anywhere, not even to us.</T>
          </View>
        </Card>
        <Gap h={space.lg} />
        <Button title="Get started" onPress={go} disabled={busy} />
        <Gap h={space.sm} />
        <Button title="Restore from a backup" kind="ghost" onPress={restore} />
        <Gap h={space.xl} />
        <T v="small" center style={{ lineHeight: 20 }}>
          Because nothing is sent anywhere, save a backup to your own Files, Drive or email now and then (Settings, Backup).
        </T>
      </View>
      {modal}
    </Screen>
  );
}
