import { useLog, useTheme } from '../store';
import { useBackup } from '../backupActions';
import { isAndroid, isIOS, isStandalone, useInstall } from '../pwa';
import { goBack, InstallSteps } from '../components';
import { Banner, Button, Card, Gap, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
/** Instagram, Facebook, Gmail… open links in their own browser, which can't add to the Home Screen. */
const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|GSA\/|WhatsApp|Snapchat/.test(ua);

/** How to add Uplift to the Home Screen, for this phone (iPhone or Android), with the one-tap install where offered. */
export default function Install() {
  const { log } = useLog();
  const { c } = useTheme();
  const { canInstall, install } = useInstall();
  const backup = useBackup();
  const ios = isIOS();
  const hasData = log.workouts.length > 0 || log.weighIns.length > 0;
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Add to Home Screen" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T>Uplift then opens like an app: full screen, works offline, and your data is less likely to be cleared by the browser.</T>
      <Gap h={space.md} />
      {isStandalone() ? <Banner tone="warn" text="You’re already using the Home Screen app." /> : inAppBrowser ? (
        <Banner text={`This is another app’s built-in browser, which can’t add to the Home Screen. Open this page in ${ios ? 'Safari' : 'Chrome'} first (look for “Open in browser” in its menu).`} />
      ) : (
        <>
          {canInstall && (
            <>
              <Button title="Install Uplift" icon="download-outline" onPress={async () => { await install(); goBack(); }} />
              <T v="small" center style={{ marginTop: space.xs }}>One tap. Or do it by hand:</T>
              <Gap h={space.md} />
            </>
          )}
          <InstallSteps />
          {!ios && !isAndroid() && <T v="small" style={{ marginTop: space.sm }}>On a computer: use the install button at the right of the address bar.</T>}
        </>
      )}
      {ios && hasData && !isStandalone() && (
        <>
          <Gap />
          <Card style={{ gap: space.sm, borderColor: c.accent }}>
            <T style={{ fontWeight: '600' }}>Bring your data with you</T>
            <T v="small">On iPhone the Home Screen app keeps its own storage, apart from Safari. Save a backup here first, then open the new app and choose “Restore from a backup”.</T>
            <Button title="Save a backup first" icon="shield-checkmark-outline" kind="secondary" onPress={backup.exportLocked} />
          </Card>
        </>
      )}
      {backup.modal}
    </Screen>
  );
}
