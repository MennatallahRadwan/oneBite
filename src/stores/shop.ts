import {defineStore} from 'pinia';
import type {Product} from '../data';

type CartItem = {product: Product; quantity: number};

const cartKey = 'onebite-cart';
const wishlistKey = 'onebite-wishlist';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useShopStore = defineStore('shop', {
  state: () => ({
    cart: read<CartItem[]>(cartKey, []),
    wishlist: read<string[]>(wishlistKey, [])
  }),

  getters: {
    cartCount: state => state.cart.reduce((total, item) => total + item.quantity, 0),
    cartTotal: state => state.cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  },

  actions: {
    persist() {
      localStorage.setItem(cartKey, JSON.stringify(this.cart));
      localStorage.setItem(wishlistKey, JSON.stringify(this.wishlist));
    },

    add(product: Product, quantity = 1) {
      const found = this.cart.find(item => item.product.id === product.id);
      if (found) found.quantity += quantity;
      else this.cart.push({product, quantity});
      this.persist();
    },

    remove(id: string) {
      this.cart = this.cart.filter(item => item.product.id !== id);
      this.persist();
    },

    qty(id: string, quantity: number) {
      const item = this.cart.find(item => item.product.id === id);
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
