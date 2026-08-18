import {defineStore} from 'pinia';
import type {Product} from '../data';

export type CartSelection = {
  variantId?: string;
  addonIds?: string[];
  cakeText?: string;
};

export type CartItem = {
  /** Identity of a configured line: the same cake in two sizes is two lines. */
  lineId: string;
  slug: string;
  /** Names are stored in both languages so switching locale relabels the cart. */
  name: string;
  nameAlt: string;
  image: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
  addonIds: string[];
  addonNames: string[];
  cakeText?: string;
  /** Price for one unit in KWD, with variant, add-ons and cake text applied. */
  unitPrice: number;
};

// v1 stored whole Product objects keyed by product id, which cannot represent
// a configured line; v2 stored a single language. Old carts are dropped rather
// than migrated.
const cartKey = 'onebite-cart-v3';
const wishlistKey = 'onebite-wishlist';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // A corrupt entry used to throw while the store was being defined, which
    // took down the whole app before it rendered.
    return fallback;
  }
}

export function lineIdFor(slug: string, selection: CartSelection) {
  return [
    slug,
    selection.variantId ?? '',
    [...(selection.addonIds ?? [])].sort().join(','),
    selection.cakeText?.trim() ?? ''
  ].join('|');
}

export function buildCartItem(
  product: Product,
  quantity: number,
  selection: CartSelection = {}
): CartItem {
  const variant = product.variants?.find(option => option.id === selection.variantId);
  const addons = (product.addons ?? []).filter(addon =>
    (selection.addonIds ?? []).includes(addon.id)
  );
  const cakeText = selection.cakeText?.trim() || undefined;

  const unitPrice =
    product.price +
    (variant?.price ?? 0) +
    addons.reduce((total, addon) => total + addon.price, 0) +
    (cakeText ? product.cakeText?.price ?? 0 : 0);

  return {
    lineId: lineIdFor(product.id, selection),
    slug: product.id,
    name: product.name,
    nameAlt: product.nameAlt,
    image: product.image,
    quantity,
    variantId: variant?.id,
    variantName: variant?.name,
    addonIds: addons.map(addon => addon.id),
    addonNames: addons.map(addon => addon.name),
    cakeText,
    unitPrice
  };
}

export const useShopStore = defineStore('shop', {
  state: () => ({
    cart: read<CartItem[]>(cartKey, []),
    wishlist: read<string[]>(wishlistKey, [])
  }),

  getters: {
    cartCount: state => state.cart.reduce((total, item) => total + item.quantity, 0),
    cartTotal: state => state.cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  },

  actions: {
    persist() {
      localStorage.setItem(cartKey, JSON.stringify(this.cart));
      localStorage.setItem(wishlistKey, JSON.stringify(this.wishlist));
    },

    add(product: Product, quantity = 1, selection: CartSelection = {}) {
      const item = buildCartItem(product, quantity, selection);
      const found = this.cart.find(existing => existing.lineId === item.lineId);
      if (found) found.quantity += quantity;
      else this.cart.push(item);
      this.persist();
    },

    remove(lineId: string) {
      this.cart = this.cart.filter(item => item.lineId !== lineId);
      this.persist();
    },

    qty(lineId: string, quantity: number) {
      const item = this.cart.find(item => item.lineId === lineId);
      if (item) item.quantity = Math.max(1, quantity);
      this.persist();
    },

    toggleWish(id: string) {
      this.wishlist = this.wishlist.includes(id)
        ? this.wishlist.filter(value => value !== id)
        : [...this.wishlist, id];
      this.persist();
    },

    clear() {
      this.cart = [];
      this.persist();
    }
  }
});
