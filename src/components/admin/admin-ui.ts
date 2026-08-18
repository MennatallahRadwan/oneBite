import {ApiError} from '../../api/client';

/**
 * The dashboard is the owner's own tool and deliberately English-only, so none
 * of this goes through the storefront's i18n. Prices are held as integer fils
 * everywhere else; the owner types and reads KWD.
 */
export const toKwd = (fils: number) => (fils / 1000).toFixed(3);
export const toFils = (kwd: string | number) => Math.round(Number(kwd) * 1000);

export const money = (fils: number) => `${toKwd(fils)} KWD`;

export const readable = (value: string) => value.replace(/_/g, ' ').toLowerCase();

export function messageFrom(reason: unknown, fallback: string) {
  if (reason instanceof ApiError) return reason.message;
  return reason instanceof Error ? reason.message : fallback;
}

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(from: string | Date, days: number) {
  const date = typeof from === 'string' ? new Date(`${from}T00:00:00.000Z`) : new Date(from);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return dayKey(date);
}

export const today = () => dayKey(new Date());

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const weekdays = weekdayNames.map((name, index) => ({index, name}));

/** Dates are stored at UTC midnight, so they are read back the same way. */
export const weekdayOf = (date: string) => weekdayNames[new Date(`${date}T00:00:00.000Z`).getUTCDay()];

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** A comma-separated field, kept as text while the owner types into it. */
export const splitList = (value: string) =>
  value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
