import {isRtl, locale} from './i18n';

// Catalog content lives in PostgreSQL and reaches the storefront through
// src/stores/catalog.ts. This module keeps only the shared shapes and the
// display helpers used across views.

export type Variant = {id: string; name: string; price: number; points: number; leadDays: number};
export type Addon = {id: string; name: string; price: number; points: number};

export type Product = {
  id: string;
  /** Name in the active language. */
  name: string;
  /** The same name in the other language, shown as a secondary line. */
  nameAlt: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
  best?: boolean;
  seasonal?: boolean;
  gift?: boolean;
  servings?: string;
  allergens?: string[];
  variants?: Variant[];
  addons?: Addon[];
  cakeText?: {maxLength: number; price: number; points: number};
  available?: boolean;
};

export type Category = {
  id: string;
  name: string;
  nameAlt: string;
  description: string;
  image: string;
  productCount: number;
};

export const img = (id: string, w = 900, h = 700) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=82`;

// Intl gives Arabic the Arabic-Indic digits, decimal separator and currency
// symbol, rather than an Arabic page showing "KWD 8.500" in Western digits.
const formatters: Record<string, Intl.NumberFormat> = {};

function currencyFormatter(tag: string) {
  formatters[tag] ??= new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
  return formatters[tag];
}

export const money = (value: number) =>
  currencyFormatter(locale.value === 'ar' ? 'ar-KW' : 'en-KW').format(value);

/** Counts and quantities, so a fully Arabic page has no Western digits. */
export const num = (value: number) =>
  new Intl.NumberFormat(isRtl.value ? 'ar-KW' : 'en-KW').format(value);
