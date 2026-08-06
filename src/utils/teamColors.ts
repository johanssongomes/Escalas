import type { TeamConfig } from '../types';

export interface TeamColor {
  badge: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const TEAM_COLOR_MAP: Record<TeamConfig['colorKey'] | 'gray', TeamColor> = {
  emerald: { badge: 'bg-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  amber:   { badge: 'bg-amber-500',   bg: 'bg-amber-100 dark:bg-amber-950/40',   text: 'text-amber-800 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800',   dot: 'bg-amber-500' },
  indigo:  { badge: 'bg-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-950/40',  text: 'text-indigo-800 dark:text-indigo-300',  border: 'border-indigo-200 dark:border-indigo-800',  dot: 'bg-indigo-500' },
  rose:    { badge: 'bg-rose-500',    bg: 'bg-rose-100 dark:bg-rose-950/40',    text: 'text-rose-800 dark:text-rose-300',    border: 'border-rose-200 dark:border-rose-800',    dot: 'bg-rose-500' },
  sky:     { badge: 'bg-sky-500',     bg: 'bg-sky-100 dark:bg-sky-950/40',     text: 'text-sky-800 dark:text-sky-300',     border: 'border-sky-200 dark:border-sky-800',     dot: 'bg-sky-500' },
  violet:  { badge: 'bg-violet-500',  bg: 'bg-violet-100 dark:bg-violet-950/40',  text: 'text-violet-800 dark:text-violet-300',  border: 'border-violet-200 dark:border-violet-800',  dot: 'bg-violet-500' },
  gray:    { badge: 'bg-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800/60',   text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-200 dark:border-slate-700',   dot: 'bg-slate-400' },
};

export function teamColorOf(colorKey?: TeamConfig['colorKey'] | null): TeamColor {
  return (colorKey && TEAM_COLOR_MAP[colorKey]) || TEAM_COLOR_MAP.gray;
}
