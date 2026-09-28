import { useState } from 'react';
import { View } from 'react-native';
import { useStore, useTheme } from '../store';
import { useBackup } from '../backupActions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GENDERS, newLog, putProfile, type Gender } from '../model';
import { DateField } from '../DateField';
import { BASE, hadOldApp } from '../pwa';
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
  const old = hadOldApp();

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
        <T style={{ color: c.muted }}>Your strength log. Exercises, sets, and progress.</T>
        <Gap h={space.xl} />
        {old && (
          <>
            <Card style={{ gap: space.sm, borderColor: c.accent }}>
              <T v="title">Used Iron Log before?</T>
              <T v="small">Bring your workouts over from the old app. Afterwards you can delete the cloud copy so nothing is kept online.</T>
              <Button title="Bring my data over" icon="arrow-forward" onPress={() => { window.location.href = `${BASE}legacy/#move`; }} />
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
          <DateField value={dob} onChange={setDob} min="1900-01-01" label="Date of birth" />
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
        <Button title="Get started" onPress={go} disabled={busy} kind={old ? 'secondary' : 'primary'} />
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
