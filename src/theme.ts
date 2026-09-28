import { useColorScheme } from 'react-native';
import type { Theme } from './model';

// Uplift: mint and graphite (brand kit v1.0). Two mints on purpose: `brand` (Mint 500) is for fills (primary
// buttons, selected chips, ticks) with graphite on top, never white; `accent` is mint that reads as text or an icon
// (Mint 700 on light surfaces, Mint 500 on dark).
const light = {
  bg: '#F7F7F5', card: '#FFFFFF', text: '#1D2125', muted: '#6B7278', border: '#EEEEEB', chip: '#EEEEEB',
  brand: '#16E29A', accent: '#087F56', onAccent: '#1D2125', accentSoft: '#E8FCF4',
  good: '#087F56', goodSoft: '#E8FCF4', danger: '#E5484D',
  field: '#FFFFFF', fieldBorder: '#C4C8CC', hint: '#A9AEB3', warnBg: '#FDF3DD', warnText: '#7A5200',
};
const dark: typeof light = {
  bg: '#1D2125', card: '#262B30', text: '#F7F7F5', muted: '#9AA0A6', border: '#3A4046', chip: '#30363C',
  brand: '#16E29A', accent: '#16E29A', onAccent: '#1D2125', accentSoft: '#15372B',
  good: '#16E29A', goodSoft: '#15372B', danger: '#FF6B6F',
  field: '#2A3036', fieldBorder: '#4A5158', hint: '#6F767C', warnBg: '#3A2E12', warnText: '#F2B233',
};
export type Colors = typeof light;

export function useColors(pref: Theme): { c: Colors; dark: boolean } {
  const system = useColorScheme();
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return { c: isDark ? dark : light, dark: isDark };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };
/** One family, Archivo (self-hosted), for everything; numbers use tabular figures so columns line up. */
export const sans = '"Archivo", system-ui, -apple-system, sans-serif';
export const font = { small: 14, body: 17, title: 22, h1: 28, big: 40 };
