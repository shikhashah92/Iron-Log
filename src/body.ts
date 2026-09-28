// Body tracking maths (pure, unit tested): the weight trend, the planned curve to a target, BMI, weigh-in reminders.
import { addDays, dayKey, daysAgo, type WeighIn, type WeightTarget } from './model.ts';

/**
 * The trend: an exponentially smoothed average, 10% per day (as in The Hacker's Diet and Happy Scale). A gap of d days
 * counts as d days of smoothing, so sparse weigh-ins still pull the trend the right amount. Daily weight swings 1-2 kg
 * on water alone; the trend is what's worth comparing.
 */
export function trendOf(weighIns: WeighIn[]): { date: string; weight: number; trend: number }[] {
  const sorted = [...weighIns].sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1));
  const out: { date: string; weight: number; trend: number }[] = [];
  for (const w of sorted) {
    const prev = out.at(-1);
    const trend = prev ? prev.trend + (1 - 0.9 ** Math.max(1, daysAgo(prev.date, w.date))) * (w.weight - prev.trend) : w.weight;
    out.push({ date: w.date, weight: w.weight, trend: Math.round(trend * 100) / 100 });
  }
  return out;
}

/**
 * The plan: a steady percentage of body weight per week from the start to the target, so it flattens as you go
 * (w = start · (target/start)^(elapsed/total)). That's the evidence-based way to pace it (about 0.5–1%/week to lose fat
 * while keeping muscle), rather than the same kilos every week.
 */
export function planAt(t: WeightTarget, day: string): number {
  const total = Math.max(1, daysAgo(t.startDate, t.date));
  const f = Math.max(0, Math.min(1, daysAgo(t.startDate, day) / total));
  return t.startWeight * (t.weight / t.startWeight) ** f;
}
/** % of body weight per week the plan asks for (positive: losing), and roughly how many kg that is per week now. */
export function planRate(t: WeightTarget): { pctPerWeek: number; kgPerWeek: number } {
  const total = Math.max(1, daysAgo(t.startDate, t.date));
  const pct = (1 - (t.weight / t.startWeight) ** (7 / total)) * 100;
  return { pctPerWeek: pct, kgPerWeek: (t.startWeight * pct) / 100 };
}
/** Whether a plan is sensible: losing faster than ~1%/week costs muscle; gaining faster than ~0.5%/week is mostly fat. */
export function planWarning(t: WeightTarget): string | null {
  const { pctPerWeek } = planRate(t);
  if (daysAgo(t.startDate, t.date) < 7) return 'Give it at least a week.';
  if (pctPerWeek > 1) return `That’s ${pctPerWeek.toFixed(1)}% of your weight a week. Above about 1% a week you lose muscle along with fat; a later date is kinder.`;
  if (pctPerWeek < -0.5) return `That’s gaining ${(-pctPerWeek).toFixed(1)}% a week. Above about 0.5% a week most of the gain is fat; a later date builds more muscle.`;
  return null;
}
/** How today's trend compares with the plan: positive `behind` means that many kg short of where the plan is today. */
export function planStatus(t: WeightTarget, trend: number, day: string): { planned: number; behind: number; label: string } {
  const planned = planAt(t, day);
  const losing = t.weight < t.startWeight;
  const behind = Math.round((losing ? trend - planned : planned - trend) * 10) / 10;
  const reached = losing ? trend <= t.weight : trend >= t.weight;
  const label = reached ? 'Target reached' : Math.abs(behind) <= 0.3 ? 'On track' : behind > 0 ? `${behind} kg behind plan` : `${-behind} kg ahead of plan`;
  return { planned, behind, label };
}
/** Daily points of the planned curve, for the chart. */
export function planCurve(t: WeightTarget): { date: string; weight: number }[] {
  const n = Math.max(1, daysAgo(t.startDate, t.date));
  const step = Math.max(1, Math.round(n / 60));
  const out: { date: string; weight: number }[] = [];
  for (let d = 0; d < n; d += step) { const day = addDays(t.startDate, d); out.push({ date: day, weight: planAt(t, day) }); }
  out.push({ date: t.date, weight: t.weight });
  return out;
}

export const bmi = (kg: number, cm: number) => (cm > 0 ? kg / (cm / 100) ** 2 : 0);
export function bmiLabel(b: number): string {
  return b < 18.5 ? 'Underweight' : b < 25 ? 'Healthy range' : b < 30 ? 'Overweight' : 'Obese range';
}
/** The weights that make BMI 18.5–24.9 at this height (the chart's faint band). */
export const healthyRange = (cm: number) => ({ lo: 18.5 * (cm / 100) ** 2, hi: 24.9 * (cm / 100) ** 2 });

/** Change in trend over the last `days` (null if there isn't history that far back). */
export function trendChange(series: { date: string; trend: number }[], today: string, days: number): number | null {
  const last = series.at(-1);
  const then = [...series].reverse().find((p) => daysAgo(p.date, today) >= days);
  return last && then ? Math.round((last.trend - then.trend) * 10) / 10 : null;
}

/** Reminder cadence: every day, 3 times a week (Mon/Wed/Fri), weekly (Monday), or off. */
export type WeighEvery = 'daily' | '3x' | 'weekly' | 'off';
const EVERY_DAYS: Record<WeighEvery, number> = { daily: 1, '3x': 2, weekly: 7, off: Infinity };
/** A weigh-in is due when the last one is older than the cadence allows (or there's none yet). */
export const weighInDue = (weighIns: WeighIn[], every: WeighEvery, today: string) => {
  if (every === 'off') return false;
  const last = weighIns.reduce((m, w) => (w.date > m ? w.date : m), '');
  return !last || daysAgo(last, today) >= EVERY_DAYS[every];
};

/** A repeating calendar event (iCalendar) so the phone itself reminds you: no server involved. */
export function reminderICS(every: Exclude<WeighEvery, 'off'>, start: Date, time = '07:30', now = new Date()): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m);
  const stamp = (x: Date) => `${dayKey(x).replace(/-/g, '')}T${String(x.getHours()).padStart(2, '0')}${String(x.getMinutes()).padStart(2, '0')}00`;
  const rule = RULE[every];
  const end = new Date(d.getTime() + 5 * 60_000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uplift//Weigh-in//EN', 'BEGIN:VEVENT',
    `UID:uplift-weigh-in-${every}@uplift`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, `RRULE:${rule}`,
    'SUMMARY:Weigh in (Uplift)', 'DESCRIPTION:Before breakfast: Uplift > Me > Log weigh-in', // under 75 bytes per line (RFC 5545)
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Weigh in', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/** The first reminder day on or after `from` that the repeat rule includes (calendars count the start day as a reminder too). */
export function reminderStart(every: Exclude<WeighEvery, 'off'>, from: Date): Date {
  const days = every === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : every === '3x' ? [1, 3, 5] : [1];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (!days.includes(d.getDay())) d.setDate(d.getDate() + 1);
  return d;
}
const RULE: Record<Exclude<WeighEvery, 'off'>, string> = { daily: 'FREQ=DAILY', '3x': 'FREQ=WEEKLY;BYDAY=MO,WE,FR', weekly: 'FREQ=WEEKLY;BYDAY=MO' };
/**
 * iPhones: the same event as a file the app hosts (public/reminders/, fixed start in January 2026): Safari opens a
 * hosted .ics straight into "Add to Calendar", where a downloaded one only lands in Files.
 */
export const REMINDER_START = new Date(2026, 0, 5); // a Monday
export const reminderFile = (every: Exclude<WeighEvery, 'off'>) => `reminders/weigh-in-${every}.ics`;
/** Android: Google Calendar's "new event" page, pre-filled and repeating (the phone's calendar app syncs it). */
export function googleCalendarURL(every: Exclude<WeighEvery, 'off'>, start: Date): string {
  const day = dayKey(start).replace(/-/g, '');
  const q = new URLSearchParams({ action: 'TEMPLATE', text: 'Weigh in (Uplift)', details: 'Before breakfast: Uplift > Me > Log weigh-in',
    dates: `${day}T073000/${day}T073500`, recur: `RRULE:${RULE[every]}` });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// ---- units (body measurements only; lifts stay in kg) ----
export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
const LB = 2.20462262, IN = 2.54;
export const toKg = (v: number, u: WeightUnit) => (u === 'lb' ? v / LB : v);
export const fromKg = (kg: number, u: WeightUnit) => (u === 'lb' ? kg * LB : kg);
export const toCm = (v: number, u: LengthUnit) => (u === 'in' ? v * IN : v);
export const fromCm = (cm: number, u: LengthUnit) => (u === 'in' ? cm / IN : cm);
const r1 = (n: number) => String(Math.round(n * 10) / 10);
export const fmtWeight = (kg: number, u: WeightUnit) => `${r1(fromKg(kg, u))} ${u}`;
export const fmtLength = (cm: number, u: LengthUnit) => `${r1(fromCm(cm, u))} ${u}`;
/** Height as 180 cm, or 5′ 11″. */
export function fmtHeight(cm: number, u: LengthUnit): string {
  if (u === 'cm') return `${Math.round(cm)} cm`;
  const total = Math.round(cm / IN);
  return `${Math.floor(total / 12)}′ ${total % 12}″`;
}
/** "5'11", 5′11″, 5 11, 71 (inches) or 180 (cm) → centimetres; null if it doesn't read as a height. */
export function parseHeight(text: string, u: LengthUnit): number | null {
  const t = text.trim();
  const ft = /^(\d)\s*(?:'|′|ft|\s)\s*(\d{1,2})?\s*(?:"|″|in)?$/.exec(t);
  const cm = u === 'in' && ft ? (Number(ft[1]) * 12 + Number(ft[2] ?? 0)) * IN : toCm(parseFloat(t.replace(',', '.')), u);
  return Number.isFinite(cm) && cm >= 50 && cm <= 272 ? Math.round(cm * 10) / 10 : null;
}
/** Height split into whole feet and inches, for two boxes. */
export function ftIn(cm: number): [number, number] {
  const total = Math.round(cm / IN);
  return [Math.floor(total / 12), total % 12];
}
/** Feet and inches boxes → centimetres (inches may run past 11); null if it isn't a plausible height. */
export function fromFtIn(ft: string, inch: string): number | null {
  const f = ft.trim() ? Number(ft) : 0, i = inch.trim() ? Number(inch.replace(',', '.')) : 0;
  const cm = (f * 12 + i) * IN;
  return Number.isFinite(cm) && f >= 0 && i >= 0 && cm >= 50 && cm <= 272 ? Math.round(cm * 10) / 10 : null;
}
/** Today, or the given day if it's a real past day (weigh-ins can be backdated, never future-dated). */
export const clampDay = (day: string, today: string) => (day > today ? today : day);
