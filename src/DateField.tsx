// Web: the browser's native <input type="date">, accessible, localised, zero dependencies (from Munshi).
import { createElement } from 'react';
import { today } from './model';
import { useTheme } from './store';

/** `min` / `max` bound the choice (by default: no future dates). */
export function DateField({ value, onChange, min, max = today(), label = 'Date' }: { value: string; onChange: (day: string) => void; min?: string; max?: string; label?: string }) {
  const { c, dark } = useTheme();
  return createElement('input', {
    type: 'date', value, min, max, 'aria-label': label,
    onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
    style: {
      minHeight: 44, padding: '0 14px', borderRadius: 999, border: 'none', background: c.chip, color: c.text,
      fontSize: 16, fontWeight: 600, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', colorScheme: dark ? 'dark' : 'light',
    },
  });
}
