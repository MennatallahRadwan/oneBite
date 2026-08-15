import {defineStore} from 'pinia';
import {api, type ApiCategory, type ApiProduct} from '../api/client';
import type {Category, Product} from '../data';

// The API speaks integer fils and En/Ar field pairs. The storefront works in
// KWD with a single display language, so the mapping happens once here rather
// than in every view.
const kwd = (value: number) => value / 1000;

const placeholderImage =
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&h=700&fit=crop&auto=format&q=82';

function toProduct(product: ApiProduct): Product {
  return {
    id: product.slug,
    name: product.nameEn,
    nameAr: product.nameAr,
    description: product.descriptionEn,
    price: kwd(product.priceFils),
    category: product.category.slug,
    image: product.imageUrl || placeholderImage,
    tags: product.tags,
    best: product.bestSeller,
    seasonal: product.seasonal,
    gift: product.giftable,
    servings: product.servingsEn ?? undefined,
    allergens: product.allergens.length ? product.allergens : undefined,
    variants: product.variants.map(variant => ({
      id: variant.id,
      name: variant.nameEn,
      price: kwd(variant.priceFils),
      points: variant.capacityPoints,
      leadDays: variant.leadDays
    })),
    addons: product.addons.map(addon => ({
      id: addon.id,
      name: addon.nameEn,
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
    name: category.nameEn,
    nameAr: category.nameAr,
    description: category.descriptionEn ?? '',
    image: category.imageUrl || placeholderImage,
    productCount: category.productCount
  };
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    products: [] as Product[],
    categories: [] as Category[],
    loading: false,
    error: '',
    loaded: false
  }),

  getters: {
    byId: state => (id: string) => state.products.find(product => product.id === id),
    inCategory: state => (category: string) =>
      state.products.filter(product => product.category === category)
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
        this.categories = categories.map(toCategory);
        this.products = products.items.map(toProduct);
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
