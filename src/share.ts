// A finished workout as a picture to post (Instagram / WhatsApp stories: 1080 × 1920), drawn on a canvas on the phone.
// Nothing is uploaded: the image goes straight to the share sheet, with a line of text that links to the site.
import { bestSet, fmtDur, fmtSet, getEx, isTimed, longDate, num, plural, recordLabel, recordsOf, workoutStats, type View, type Workout } from './model';
import { workoutCalories } from './calories';
import { saveFile } from './io';

export const SITE_URL = 'https://getuplift.pro';
const W = 1080, H = 1920, PAD = 88;
const INK = '#1D2125', CARD = '#262B30', LINE = '#3A4046', MINT = '#16E29A', TEXT = '#F7F7F5', MUTED = '#9AA0A6';
const FONT = '"Archivo", system-ui, sans-serif';

/** The caption that goes with the picture (WhatsApp keeps it; Instagram drops text, so the picture carries the link too). */
export function shareText(v: View, w: Workout): string {
  const n = recordsOf(v, w).length;
  return `${w.name} done 💪${n ? ` ${plural(n, 'new personal best')}!` : ''}\nLogged with Uplift, a free workout log that keeps everything on your phone: ${SITE_URL}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= max || !cur) cur = next;
    else { out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] = `${out[lines - 1].replace(/\s+\S*$/, '')}…`; }
  return out;
}
/** Shrink text to fit a width (a long exercise name on one line). */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

export async function drawWorkout(v: View, w: Workout): Promise<Blob> {
  await Promise.all(['400', '600', '800'].map((wt) => document.fonts?.load(`${wt} 48px Archivo`).catch(() => null)));
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  // A soft mint glow behind the title.
  const glow = ctx.createRadialGradient(W * 0.8, 260, 0, W * 0.8, 260, 700);
  glow.addColorStop(0, 'rgba(22,226,154,0.22)'); glow.addColorStop(1, 'rgba(22,226,154,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Brand: the mark and the wordmark ("up" white, "lift" mint).
  let y = 150;
  try { const mark = await loadImage('brand/mark-reversed.svg'); ctx.drawImage(mark, PAD - 8, y - 72, 104, 104); } catch { /* the wordmark alone will do */ }
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 68px ${FONT}`; ctx.fillStyle = TEXT; ctx.fillText('up', PAD + 112, y);
  ctx.fillStyle = MINT; ctx.fillText('lift', PAD + 112 + ctx.measureText('up').width, y);

  // Title and when.
  y = 330;
  ctx.font = `800 104px ${FONT}`; ctx.fillStyle = TEXT;
  for (const line of wrap(ctx, w.name, W - PAD * 2, 2)) { ctx.fillText(line, PAD, y); y += 112; }
  const mins = w.endedAt ? Math.round((w.endedAt - w.startedAt) / 60_000) : 0;
  ctx.font = `500 40px ${FONT}`; ctx.fillStyle = MUTED;
  ctx.fillText(longDate(w.date), PAD, y - 40);
  y += 30;

  // Three numbers.
  const { sets, volume } = workoutStats(v, w);
  const kcal = workoutCalories(v, w);
  const stats: [string, string][] = [['Time', mins ? fmtDur(mins * 60) : '–'], volume ? ['Volume', volume >= 1000 ? `${num(Math.round(volume / 100) / 10)} t` : `${num(Math.round(volume))} kg`] : ['Sets', String(sets)],
    kcal ? ['Calories', `≈${kcal}`] : ['Exercises', String(w.exercises.length)]];
  const bw = (W - PAD * 2 - 2 * 24) / 3;
  stats.forEach(([k, val], i) => {
    const x = PAD + i * (bw + 24);
    ctx.fillStyle = CARD; roundRect(ctx, x, y, bw, 180, 28); ctx.fill();
    ctx.font = `600 32px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(k, x + 32, y + 62);
    ctx.font = `800 64px ${FONT}`; ctx.fillStyle = TEXT; ctx.fillText(fit(ctx, val, bw - 56), x + 32, y + 142);
  });
  y += 180 + 56;

  // Personal bests, one line per exercise.
  const recs = recordsOf(v, w);
  if (recs.length) {
    const byEx = [...new Set(recs.map((r) => r.exerciseId))];
    const shown = byEx.slice(0, 3);
    const h = 110 + shown.length * 78;
    ctx.fillStyle = 'rgba(22,226,154,0.12)'; roundRect(ctx, PAD, y, W - PAD * 2, h, 32); ctx.fill();
    ctx.strokeStyle = MINT; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = `800 44px ${FONT}`; ctx.fillStyle = MINT;
    ctx.fillText(`★  ${recs.length === 1 ? 'New personal best' : `${recs.length} new personal bests`}`, PAD + 40, y + 76);
    shown.forEach((id, i) => {
      const yy = y + 76 + (i + 1) * 78;
      const labels = recs.filter((r) => r.exerciseId === id).map(recordLabel).join(' · ');
      ctx.font = `700 36px ${FONT}`; ctx.fillStyle = TEXT; const name = fit(ctx, getEx(v, id).name, 420); ctx.fillText(name, PAD + 40, yy);
      ctx.font = `500 32px ${FONT}`; ctx.fillStyle = TEXT; ctx.textAlign = 'right'; ctx.fillText(fit(ctx, labels, W - PAD * 2 - 80 - 440), W - PAD - 40, yy); ctx.textAlign = 'left';
    });
    y += h + 56;
  }

  // What was done: each exercise with its best set.
  ctx.font = `700 34px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText('WORKOUT', PAD, y); y += 30;
  const room = Math.floor((H - 300 - y) / 92);
  const list = w.exercises.slice(0, Math.max(1, w.exercises.length > room ? room - 1 : room));
  for (const e of list) {
    const ex = getEx(v, e.exerciseId);
    const best = isTimed(ex) ? e.sets[0] : bestSet(e.sets.filter((s) => s.kind !== 'W').length ? e.sets.filter((s) => s.kind !== 'W') : e.sets);
    y += 92;
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, y - 62); ctx.lineTo(W - PAD, y - 62); ctx.stroke();
    const right = best ? fmtSet(best, ex) : '';
    ctx.font = `500 36px ${FONT}`; const rw = ctx.measureText(right).width;
    ctx.font = `700 40px ${FONT}`; ctx.fillStyle = TEXT;
    ctx.fillText(fit(ctx, isTimed(ex) ? ex.name : `${e.sets.length} × ${ex.name}`, W - PAD * 2 - rw - 32), PAD, y);
    ctx.font = `500 36px ${FONT}`; ctx.fillStyle = MUTED; ctx.textAlign = 'right'; ctx.fillText(right, W - PAD, y); ctx.textAlign = 'left';
  }
  if (list.length < w.exercises.length) { y += 80; ctx.font = `500 34px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`+ ${plural(w.exercises.length - list.length, 'more exercise')}`, PAD, y); }

  // Footer: where to get it.
  ctx.fillStyle = MINT; roundRect(ctx, PAD, H - 210, W - PAD * 2, 120, 60); ctx.fill();
  ctx.font = `800 44px ${FONT}`; ctx.fillStyle = INK; ctx.textAlign = 'center';
  ctx.fillText('Track yours free · getuplift.pro', W / 2, H - 134); ctx.textAlign = 'left';

  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Could not make the picture'))), 'image/png'));
}

/** Make the picture and open the share sheet (a download on a computer). */
export async function shareWorkout(v: View, w: Workout, ready?: Blob): Promise<boolean> {
  // `ready`: drawn in advance, so the share sheet opens straight from the tap (iPhone refuses it after a long wait).
  const blob = ready ?? await drawWorkout(v, w);
  const name = `uplift-${w.date}-${w.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workout'}.png`;
  return saveFile(name, blob, 'image/png', shareText(v, w));
}
