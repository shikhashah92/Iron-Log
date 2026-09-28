// In-app dialogs (confirm / notice / text prompt). The browser's own window.confirm and prompt look out of place in an
// installed app, and some embedded browsers dismiss them without asking. One at a time; extra requests queue.
import { useState, useSyncExternalStore } from 'react';
import { Modal, View } from 'react-native';
import { useTheme } from './store';
import { Button, Field, selectAll, T } from './ui';
import { radius, space } from './theme';

interface Req {
  id: number;
  title: string; message?: string; ok: string; cancel?: string; destructive?: boolean;
  input?: { value: string; placeholder?: string };
  done: (v: string | boolean | null) => void;
}
let queue: Req[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
function open<T>(r: Omit<Req, 'done' | 'id'>): Promise<T> {
  return new Promise((resolve) => {
    queue = [...queue, { ...r, id: ++seq, done: (v) => resolve(v as T) }];
    listeners.forEach((f) => f());
  });
}
function close(v: string | boolean | null) {
  const [head, ...rest] = queue;
  queue = rest;
  listeners.forEach((f) => f());
  head?.done(v);
}

export const confirmDialog = (title: string, message: string, ok = 'OK', destructive = false) =>
  open<boolean>({ title, message, ok, cancel: 'Cancel', destructive });
/** Two answers: resolves true for `a`, false for `b` (closing the dialog counts as `b`). */
export const chooseDialog = (title: string, message: string, a: string, b: string) => open<boolean>({ title, message, ok: a, cancel: b });
export const noticeDialog = (title: string, message?: string) => open<boolean>({ title, message, ok: 'OK' }).then(() => {});
/** Resolves to the trimmed text, or null if cancelled or left empty. */
export const askDialog = (title: string, value = '', placeholder?: string) =>
  open<string | null>({ title, ok: 'Save', cancel: 'Cancel', input: { value, placeholder } })
    .then((v) => (typeof v === 'string' && v.trim() ? v.trim() : null));

/** Mounted once at the root. */
export function DialogHost() {
  const r = useSyncExternalStore(subscribe, () => queue[0] ?? null);
  return r ? <Dialog key={r.id} r={r} /> : null;
}

function Dialog({ r }: { r: Req }) {
  const { c } = useTheme();
  const [text, setText] = useState(r.input?.value ?? '');
  const ok = () => close(r.input ? text : true);
  const cancel = () => close(r.input ? null : false);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={r.cancel ? cancel : ok}>
      <View style={{ flex: 1, backgroundColor: '#0008', padding: space.lg, paddingTop: 96 }}>{/* top-aligned: stays above the keyboard */}
        <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: c.bg, borderRadius: radius.lg, padding: space.xl, gap: space.md }}>
          <T v="title">{r.title}</T>
          {r.message ? <T v="small" style={{ lineHeight: 20, color: c.text }}>{r.message}</T> : null}
          {r.input && (
            <Field value={text} onChangeText={setText} placeholder={r.input.placeholder} autoFocus onFocus={selectAll}
              accessibilityLabel={r.title} onSubmitEditing={ok} returnKeyType="done" />
          )}
          <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' }}>
            {r.cancel && <Button title={r.cancel} kind="ghost" onPress={cancel} />}
            <Button title={r.ok} kind={r.destructive ? 'danger' : 'primary'} onPress={ok} style={{ minWidth: 96 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
