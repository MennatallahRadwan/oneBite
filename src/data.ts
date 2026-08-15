// Catalog content lives in PostgreSQL and reaches the storefront through
// src/stores/catalog.ts. This module keeps only the shared shapes and the
// display helpers used across views.

export type Variant = {id: string; name: string; price: number; points: number; leadDays: number};
export type Addon = {id: string; name: string; price: number; points: number};

export type Product = {
  id: string;
  name: string;
  nameAr: string;
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
  nameAr: string;
  description: string;
  image: string;
  productCount: number;
};

export const img = (id: string, w = 900, h = 700) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=82`;

export const money = (value: number) => `KWD ${value.toFixed(3)}`;
