import {defineStore} from 'pinia';
import {api, type CustomerAccount, type CustomerAddressInput} from '../api/client';

type Credentials = {email: string; password: string};
type Registration = Credentials & {name: string};

export const useCustomerStore = defineStore('customer', {
  state: () => ({
    account: null as CustomerAccount | null,
    checked: false,
    loading: false,
    error: ''
  }),

  getters: {
    signedIn: state => Boolean(state.account),
    customer: state => state.account?.customer ?? null,
    orders: state => state.account?.orders ?? [],
    addresses: state => state.account?.addresses ?? [],
    wishlist: state => state.account?.wishlist ?? []
  },

  actions: {
    async load() {
      this.loading = true;
      this.error = '';
      try {
        this.account = await api.customer.me();
      } catch {
        this.account = null;
      } finally {
        this.checked = true;
        this.loading = false;
      }
    },

    async register(input: Registration, localWishlist: string[]) {
      await api.customer.register(input.name, input.email, input.password);
      this.account = await api.customer.me();
      await this.syncWishlist(localWishlist);
    },

    async login(input: Credentials, localWishlist: string[]) {
      await api.customer.login(input.email, input.password);
      this.account = await api.customer.me();
      await this.syncWishlist([...new Set([...this.wishlist, ...localWishlist])]);
    },

    async changePassword(currentPassword: string, newPassword: string) {
      await api.customer.changePassword(currentPassword, newPassword);
    },

    async logout() {
      await api.customer.logout();
      this.account = null;
      this.checked = true;
    },

    async syncWishlist(slugs: string[]) {
      if (!this.account) return slugs;
      const result = await api.customer.syncWishlist([...new Set(slugs)]);
      this.account.wishlist = result.wishlist;
      return result.wishlist;
    },

    async addAddress(address: CustomerAddressInput) {
      const created = await api.customer.createAddress(address);
      if (this.account) this.account.addresses = [created, ...this.account.addresses];
    },

    async deleteAddress(id: string) {
      await api.customer.deleteAddress(id);
      if (this.account) this.account.addresses = this.account.addresses.filter(address => address.id !== id);
    },

    async cancelOrder(publicNumber: string) {
      await api.customer.cancelOrder(publicNumber);
      await this.load();
    }
  }
});
