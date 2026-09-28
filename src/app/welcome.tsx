import { useState } from 'react';
import { View } from 'react-native';
import { useStore, useTheme } from '../store';
import { useBackup } from '../backupActions';
import { newLog } from '../model';
import { BASE, hadOldApp } from '../pwa';
import { BrandMark, Button, Card, Field, Gap, Screen, T } from '../ui';
import { space } from '../theme';

/** First screen: no sign-up. Start, restore a backup, or move over from the old app. */
export default function Welcome() {
  const { start } = useStore();
  const { restore, modal } = useBackup();
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const old = hadOldApp();

  async function go() {
    setBusy(true);
    try { await start({ log: newLog(name.trim().slice(0, 40) || 'Me'), images: {} }); } finally { setBusy(false); }
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
        <Field label="Your name (optional)" placeholder="Me" value={name} onChangeText={setName} autoCapitalize="words" onSubmitEditing={go} />
        <Gap h={space.md} />
        <Button title="Get started" onPress={go} disabled={busy} kind={old ? 'secondary' : 'primary'} />
        <Gap h={space.sm} />
        <Button title="Restore from a backup" kind="ghost" onPress={restore} />
        <Gap h={space.xl} />
        <T v="small" center style={{ lineHeight: 20 }}>
          No sign-up. Everything you log stays on this phone. Nothing is sent anywhere, so save a backup to your own Files, Drive or email now and then.
        </T>
      </View>
      {modal}
    </Screen>
  );
}
