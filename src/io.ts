// File export/import, photos, and dialogs (in-app ones: react-native-web's Alert is a no-op, window.confirm looks out of place).
import { MAX_IMPORT_BYTES } from './backup';
import { askDialog, confirmDialog, noticeDialog } from './dialog';

/**
 * Phones: the system share sheet (Save to Files, iCloud Drive, Google Drive, Mail) in one tap.
 * Computers, or if sharing isn't allowed: a normal download. Returns false if the person cancelled.
 */
export async function saveFile(name: string, content: BlobPart, mimeType: string, text?: string): Promise<boolean> {
  const file = new File([content], name, { type: mimeType });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], ...(text ? { text } : { title: name }) });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      // e.g. NotAllowedError when the tap's user activation was used up by a dialog: fall back to a download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export function pickTextFile(accept = 'application/json,.json'): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      if (f.size > MAX_IMPORT_BYTES) return reject(new Error('File is too large to be an Uplift backup.'));
      f.text().then(resolve, reject);
    };
    input.click();
  });
}

export const confirm = (title: string, message: string, ok = 'OK', destructive = false) => confirmDialog(title, message, ok, destructive);

export function notify(title: string, message?: string) {
  noticeDialog(title, message);
}

export const ask = (title: string, value = '') => askDialog(title, value);
export { chooseDialog as choose, menuDialog as menu } from './dialog';

/** Pick a photo and shrink it to a small JPEG data URI (GIFs are kept as they are, if small). */
export function pickImage(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Couldn’t read that file.'));
      reader.onload = () => {
        const uri = reader.result as string;
        if (f.type === 'image/gif') return f.size > 230_000 ? reject(new Error('That GIF is too large (keep it under about 220 KB).')) : resolve(uri);
        const img = new Image();
        img.onerror = () => reject(new Error('Couldn’t read that image.'));
        img.onload = () => {
          const sc = Math.min(1, 560 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * sc);
          c.height = Math.round(img.height * sc);
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
          let q = 0.75, out = c.toDataURL('image/jpeg', q);
          while (out.length > 230_000 && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
          resolve(out);
        };
        img.src = uri;
      };
      reader.readAsDataURL(f);
    };
    input.click();
  });
}
