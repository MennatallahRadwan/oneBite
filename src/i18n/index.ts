import {computed, ref} from 'vue';
import {en, type Dictionary, type MessageKey} from './en';
import {ar} from './ar';

export type Locale = 'en' | 'ar';
export type {MessageKey} from './en';

export const locales: Locale[] = ['en', 'ar'];

const dictionaries: Record<Locale, Dictionary> = {en, ar};

/** Arabic lives under a /ar path prefix; English is served from the root. */
const prefixes: Record<Locale, string> = {en: '', ar: '/ar'};

export const storageKey = 'onebite-locale';

// Held outside a Pinia store so the router guard, which runs before any
// component exists, can read and set it.
export const locale = ref<Locale>('en');

export const isRtl = computed(() => locale.value === 'ar');

export const direction = computed(() => (isRtl.value ? 'rtl' : 'ltr'));

/** Reads the locale a path encodes, independent of the current one. */
export function localeFromPath(path: string): Locale {
  return path === '/ar' || path.startsWith('/ar/') ? 'ar' : 'en';
}

/** Strips the locale prefix, giving the shared path both locales route to. */
export function basePath(path: string): string {
  if (path === '/ar') return '/';
  return path.startsWith('/ar/') ? path.slice(3) : path;
}

/** Builds the path for a locale from an unprefixed one. */
export function localePath(path: string, target: Locale = locale.value): string {
  const clean = basePath(path);
  const prefix = prefixes[target];
  if (!prefix) return clean;
  return clean === '/' ? prefix : `${prefix}${clean}`;
}

export function applyDocumentLocale() {
  const root = document.documentElement;
  root.setAttribute('lang', locale.value);
  root.setAttribute('dir', direction.value);
}

export function setLocale(next: Locale) {
  locale.value = next;
  try {
    localStorage.setItem(storageKey, next);
  } catch {
    // Private browsing can refuse writes; the locale still applies to this
    // page load, it just is not remembered.
  }
  applyDocumentLocale();
}

/** The visitor's remembered choice, if they have one. */
export function storedLocale(): Locale | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === 'en' || value === 'ar' ? value : null;
  } catch {
    return null;
  }
}

export type MessageVars = Record<string, string | number>;

/**
 * Looks a message up and fills `{name}` placeholders. Numbers are formatted for
 * the locale, so counts inside Arabic copy use Arabic-Indic digits.
 */
export function translate(key: MessageKey, target: Locale, vars?: MessageVars): string {
  const template = dictionaries[target][key] ?? en[key] ?? key;
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) return match;
    return typeof value === 'number'
      ? new Intl.NumberFormat(target === 'ar' ? 'ar-KW' : 'en-KW').format(value)
      : value;
  });
}

export function t(key: MessageKey, vars?: MessageVars): string {
  return translate(key, locale.value, vars);
}

/** Picks the field for the active locale from an API record's En/Ar pair. */
export function pick<T>(en: T, ar: T | null | undefined): T {
  return isRtl.value && ar ? ar : en;
}

/**
 * Arabic-Indic digits for prices and counts. Kuwait uses both, but a page that
 * is otherwise fully Arabic reading Western digits looks half-translated.
 */
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function localizeDigits(value: string): string {
  if (!isRtl.value) return value;
  return value.replace(/\d/g, digit => arabicDigits[Number(digit)]);
}
