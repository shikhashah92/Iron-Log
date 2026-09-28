// Web: the browser's native <input type="date">, accessible, localised, zero dependencies (from Munshi).
import { createElement } from 'react';
import { today } from './model';
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
