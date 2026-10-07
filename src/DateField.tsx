// Web: the browser's native <input type="date">, accessible, localised, zero dependencies (from Munshi).
import { createElement, useState } from 'react';
import { ageOn, dateWithYear, dayKey, dobMask, dobParse, today } from './model';
import { useTheme } from './store';

/** `min` / `max` bound the choice (by default: no future dates). */
export function DateField({ value, onChange, min, max = today(), label = 'Date' }: { value: string; onChange: (day: string) => void; min?: string; max?: string; label?: string }) {
  const { c, dark } = useTheme();
  const input = createElement('input', {
    type: 'date', value, min, max, 'aria-label': label,
    onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
    style: {
      minHeight: 44, minWidth: 160, padding: '0 14px', borderRadius: 999, border: 'none', background: c.chip, color: value ? c.text : 'transparent',
      fontSize: 16, fontWeight: 600, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', colorScheme: dark ? 'dark' : 'light',
    },
  });
  if (value) return input;
  // Empty: iPhones draw a blank pill, so say what it's for (taps go through to the date picker underneath).
  return createElement('div', { style: { position: 'relative', display: 'inline-block' } }, input,
    createElement('span', { 'aria-hidden': true, style: { position: 'absolute', left: 14, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none',
      color: c.muted, fontSize: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } }, 'Choose a date'));
}

/** A moment (ms), as the browser's native date-and-time picker. By default the picker stops at today. */
export function DateTimeField({ value, onChange, min, max, label = 'Date and time' }: { value: number; onChange: (ms: number) => void; min?: number; max?: number; label?: string }) {
  const { c, dark } = useTheme();
  const local = (ms: number) => { const d = new Date(ms); return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  return createElement('input', {
    type: 'datetime-local', value: local(value), min: min === undefined ? undefined : local(min), max: max === undefined ? `${today()}T23:59` : local(max), 'aria-label': label,
    onChange: (e: { target: { value: string } }) => { const ms = new Date(e.target.value).getTime(); if (Number.isFinite(ms)) onChange(max === undefined ? ms : Math.min(ms, max)); },
    style: {
      minHeight: 44, padding: '0 14px', borderRadius: 999, border: 'none', background: c.chip, color: c.text,
      fontSize: 16, fontWeight: 600, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', colorScheme: dark ? 'dark' : 'light',
    },
  });
}

/**
 * Date of birth, typed as DD/MM/YYYY on the number pad. Android Chrome's date picker opens near `max` (decades from a
 * birthday) and, typing the year, can save the `min` year (1900) instead. Reports '' until the date is whole and real.
 */
export function DobField({ value, onChange, min = '1900-01-01', max }: { value: string; onChange: (day: string) => void; min?: string; max: string }) {
  const { c } = useTheme();
  const fromValue = (v: string) => (v ? v.split('-').reverse().join('/') : '');
  const [text, setText] = useState(() => fromValue(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setText(fromValue(value)); } // Clear, or a date set elsewhere
  const { day, error } = dobParse(text, min, max);
  const input = createElement('input', {
    value: text, placeholder: 'DD/MM/YYYY', inputMode: 'numeric', autoComplete: 'bday', 'aria-label': 'Date of birth, day month year', 'aria-invalid': !!error,
    onChange: (e: { target: { value: string } }) => {
      const next = dobMask(e.target.value.replace(/\D/g, ''));
      const day = dobParse(next, min, max).day ?? '';
      setText(next); setSeen(day); onChange(day);
    },
    style: {
      minHeight: 44, width: 170, padding: '0 16px', borderRadius: 999, border: 'none', background: c.chip, color: c.text, fontSize: 18, fontWeight: 600,
      letterSpacing: 1, fontVariantNumeric: 'tabular-nums', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  });
  return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, input,
    // Said back in words, so a day/month mix-up (09/12) is caught before it's saved.
    error || day ? createElement('span', { role: error ? 'alert' : 'status', style: { color: error ? c.danger : c.muted, fontSize: 14, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } },
      error ?? `${dateWithYear(day!)} · ${ageOn(day!)} years old`) : null);
}
