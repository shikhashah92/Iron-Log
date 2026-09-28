import { useColorScheme } from 'react-native';
import type { Theme } from './model';

// Iron Log's chalk-and-rust palette, carried over from the original app.
const light = {
  bg: '#e7e4de', card: '#f6f4ef', text: '#1c1a16', muted: '#6c675d', border: '#d3cec3', chip: '#efece5',
  accent: '#a23b23', onAccent: '#FFFFFF', accentSoft: '#f0e0d8',
  good: '#3f7a34', goodSoft: '#e2ecdc', danger: '#a23b23',
  field: '#ffffff', fieldBorder: '#bfb8aa', hint: '#b3ac9f', warnBg: '#f4e7c9', warnText: '#6e4b00',
};
const dark: typeof light = {
  bg: '#151719', card: '#1f2224', text: '#ece9e2', muted: '#948f84', border: '#343a3d', chip: '#26292c',
  accent: '#e2724f', onAccent: '#151719', accentSoft: '#3a2620',
  good: '#83c069', goodSoft: '#28311f', danger: '#e88a6c',
  field: '#2b2f32', fieldBorder: '#4b5256', hint: '#6d6a63', warnBg: '#3a2a0e', warnText: '#f5c26b',
};
export type Colors = typeof light;

export function useColors(pref: Theme): { c: Colors; dark: boolean } {
  const system = useColorScheme();
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return { c: isDark ? dark : light, dark: isDark };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 9, md: 13, lg: 16, pill: 999 };
/** Headings: condensed and uppercase, like a gym whiteboard. Numbers: monospace so columns line up. */
export const condensed = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif';
export const mono = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
export const font = { small: 14, body: 17, title: 22, h1: 28, big: 40 };
