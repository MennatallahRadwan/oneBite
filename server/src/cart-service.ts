import {prisma} from './db.js';

export type CartLine = {
  slug: string;
  quantity: number;
  variantId?: string;
  addonIds?: string[];
  cakeText?: string;
};

type Option = {id: string; nameEn: string; nameAr: string; priceFils: number; capacityPoints: number};

export type ResolvedLine = {
  slug: string;
  quantity: number;
  product: {
    nameEn: string;
    nameAr: string;
    priceFils: number;
    allergens: string[];
    imageUrl: string | null;
  };
  variant: (Option & {leadDays: number}) | null;
  addons: Option[];
  cakeText: string | null;
  /** Price of one unit with the chosen variant, add-ons and cake text applied. */
  unitPriceFils: number;
  /** Production points one unit consumes with those same choices applied. */
  unitCapacityPoints: number;
  leadDays: number;
};

/** A cart the customer cannot have built through the storefront. */
export class CartError extends Error {}

const unavailable = 'Temporarily unavailable.';

/**
 * Turns raw cart lines into priced, capacity-costed lines.
 *
 * A variant replaces the product's own capacity points — a larger cake is not
 * a small cake plus a surcharge in production terms — while its price is added
 * on top of the base price. Add-ons and cake text add both.
 */
export async function resolveCartLines(lines: CartLine[]): Promise<ResolvedLine[]> {
  const products = await prisma.product.findMany({
    where: {slug: {in: lines.map(line => line.slug)}, published: true, active: true, archivedAt: null},
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameAr: true,
      priceFils: true,
      capacityPoints: true,
      leadDays: true,
      allergens: true,
      imageUrl: true,
      cakeTextMaxLength: true,
      cakeTextPriceFils: true,
      cakeTextPoints: true,
      variants: {where: {active: true}},
      addons: {where: {active: true}}
    }
  });

  const bySlug = new Map(products.map(product => [product.slug, product]));

  return lines.map(line => {
    const product = bySlug.get(line.slug);
    if (!product) throw new CartError(unavailable);

    const variant = line.variantId
      ? product.variants.find(option => option.id === line.variantId)
      : null;
    if (line.variantId && !variant) throw new CartError(`That option is no longer available for ${product.nameEn}.`);

    const addonIds = line.addonIds ?? [];
    const addons = addonIds.map(id => {
      const addon = product.addons.find(option => option.id === id);
      if (!addon) throw new CartError(`That extra is no longer available for ${product.nameEn}.`);
      return addon;
    });

    const cakeText = line.cakeText?.trim() || null;
    if (cakeText) {
      if (product.cakeTextMaxLength === null) {
        throw new CartError(`${product.nameEn} does not support a written message.`);
      }
      if (cakeText.length > product.cakeTextMaxLength) {
        throw new CartError(
          `The message on ${product.nameEn} must be ${product.cakeTextMaxLength} characters or fewer.`
        );
      }
    }

    const addonPrice = addons.reduce((total, addon) => total + addon.priceFils, 0);
    const addonPoints = addons.reduce((total, addon) => total + addon.capacityPoints, 0);
    const cakeTextPrice = cakeText ? product.cakeTextPriceFils ?? 0 : 0;
    const cakeTextPoints = cakeText ? product.cakeTextPoints ?? 0 : 0;

    return {
      slug: product.slug,
      quantity: line.quantity,
      product: {
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        priceFils: product.priceFils,
        allergens: product.allergens,
        imageUrl: product.imageUrl
      },
      variant: variant ?? null,
      addons,
      cakeText,
      unitPriceFils: product.priceFils + (variant?.priceFils ?? 0) + addonPrice + cakeTextPrice,
      unitCapacityPoints: (variant?.capacityPoints ?? product.capacityPoints) + addonPoints + cakeTextPoints,
      leadDays: variant?.leadDays ?? product.leadDays
    };
  });
}

export const cartCapacityPoints = (lines: ResolvedLine[]) =>
  lines.reduce((total, line) => total + line.unitCapacityPoints * line.quantity, 0);

export const cartSubtotalFils = (lines: ResolvedLine[]) =>
  lines.reduce((total, line) => total + line.unitPriceFils * line.quantity, 0);

export const cartLeadDays = (lines: ResolvedLine[]) =>
  Math.max(...lines.map(line => line.leadDays));
