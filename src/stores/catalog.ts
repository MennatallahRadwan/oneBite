import {defineStore} from 'pinia';
import {api, type ApiCategory, type ApiProduct} from '../api/client';
import {isRtl} from '../i18n';
import type {Category, Product} from '../data';

// The API speaks integer fils and En/Ar field pairs. The storefront works in
// KWD in one language at a time, so the raw records are kept in state and the
// mapping happens in getters — switching language re-maps what is already
// loaded instead of refetching.
const kwd = (value: number) => value / 1000;

const placeholderImage =
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&h=700&fit=crop&auto=format&q=82';

const primary = (en: string, ar: string) => (isRtl.value ? ar : en);
const secondary = (en: string, ar: string) => (isRtl.value ? en : ar);

function toProduct(product: ApiProduct): Product {
  const description = isRtl.value ? product.descriptionAr : product.descriptionEn;
  const servings = isRtl.value ? product.servingsAr : product.servingsEn;

  return {
    id: product.slug,
    name: primary(product.nameEn, product.nameAr),
    nameAlt: secondary(product.nameEn, product.nameAr),
    description: description || product.descriptionEn,
    price: kwd(product.priceFils),
    category: product.category.slug,
    image: product.imageUrl || placeholderImage,
    tags: isRtl.value && product.tagsAr.length ? product.tagsAr : product.tags,
    best: product.bestSeller,
    seasonal: product.seasonal,
    gift: product.giftable,
    servings: servings ?? undefined,
    allergens: product.allergens.length ? product.allergens : undefined,
    variants: product.variants.map(variant => ({
      id: variant.id,
      name: primary(variant.nameEn, variant.nameAr),
      price: kwd(variant.priceFils),
      points: variant.capacityPoints,
      leadDays: variant.leadDays
    })),
    addons: product.addons.map(addon => ({
      id: addon.id,
      name: primary(addon.nameEn, addon.nameAr),
      price: kwd(addon.priceFils),
      points: addon.capacityPoints
    })),
    cakeText:
      product.cakeTextMaxLength === null
        ? undefined
        : {
            maxLength: product.cakeTextMaxLength,
            price: kwd(product.cakeTextPriceFils ?? 0),
            points: product.cakeTextPoints ?? 0
          }
  };
}

function toCategory(category: ApiCategory): Category {
  return {
    id: category.slug,
    name: primary(category.nameEn, category.nameAr),
    nameAlt: secondary(category.nameEn, category.nameAr),
    description: (isRtl.value ? category.descriptionAr : category.descriptionEn) ?? '',
    image: category.imageUrl || placeholderImage,
    productCount: category.productCount
  };
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    rawProducts: [] as ApiProduct[],
    rawCategories: [] as ApiCategory[],
    loading: false,
    error: '',
    loaded: false
  }),

  getters: {
    products: (state): Product[] => state.rawProducts.map(toProduct),
    categories: (state): Category[] => state.rawCategories.map(toCategory),
    byId(): (id: string) => Product | undefined {
      return id => this.products.find(product => product.id === id);
    },
    inCategory(): (category: string) => Product[] {
      return category => this.products.filter(product => product.category === category);
    }
  },

  actions: {
    // Cached for the session: the catalog changes far less often than a visitor
    // moves between pages, and every view calls this on mount.
    async load(force = false) {
      if (this.loading) return;
      if (this.loaded && !force) return;

      this.loading = true;
      this.error = '';
      try {
        const [categories, products] = await Promise.all([api.categories(), api.products()]);
        this.rawCategories = categories;
        this.rawProducts = products.items;
        this.loaded = true;
      } catch (reason) {
        this.error =
          reason instanceof Error ? reason.message : 'Unable to load the bakery menu right now.';
      } finally {
        this.loading = false;
      }
    }
  }
});
