<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Heart, Home, LogOut, Package, Plus, ShieldCheck, Trash2, X} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import AppLink from '../components/AppLink.vue';
import {money} from '../data';
import {t, type MessageKey} from '../i18n';
import {errorMessage} from '../i18n/errors';
import {useCustomerStore} from '../stores/customer';
import {useShopStore} from '../stores/shop';

const customer = useCustomerStore();
const shop = useShopStore();
const mode = ref<'login' | 'register'>('login');
const busy = ref(false);
const error = ref('');

const auth = ref({name: '', email: '', password: ''});
const address = ref({
  label: 'Home',
  governorate: '',
  areaName: '',
  block: '',
  street: '',
  building: '',
  floorOrApartment: '',
  deliveryInstructions: ''
});

onMounted(async () => {
  await customer.load();
  if (customer.account?.wishlist.length) shop.setWishlist(customer.account.wishlist);
});

async function submitAuth() {
  busy.value = true;
  error.value = '';
  try {
    if (mode.value === 'register') await customer.register(auth.value, shop.wishlist);
    else await customer.login(auth.value, shop.wishlist);
    if (customer.account) shop.setWishlist(customer.account.wishlist);
  } catch (reason) {
    error.value = errorMessage(reason, 'error.order');
  } finally {
    busy.value = false;
  }
}

async function logout() {
  await customer.logout();
}

async function addAddress() {
  busy.value = true;
  error.value = '';
  try {
    await customer.addAddress({
      label: address.value.label || 'Home',
      governorate: address.value.governorate,
      areaName: address.value.areaName,
      block: address.value.block,
      street: address.value.street,
      building: address.value.building,
      floorOrApartment: address.value.floorOrApartment || undefined,
      deliveryInstructions: address.value.deliveryInstructions || undefined
    });
    address.value = {
      label: 'Home',
      governorate: '',
      areaName: '',
      block: '',
      street: '',
      building: '',
      floorOrApartment: '',
      deliveryInstructions: ''
    };
  } catch (reason) {
    error.value = errorMessage(reason, 'error.order');
  } finally {
    busy.value = false;
  }
}

async function cancel(publicNumber: string) {
  if (!window.confirm(t('tracking.cancelConfirm'))) return;
  busy.value = true;
  error.value = '';
  try {
    await customer.cancelOrder(publicNumber);
  } catch (reason) {
    error.value = errorMessage(reason, 'error.order');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <PageHero
    :eyebrow="t('profile.eyebrow')"
    :title="customer.signedIn ? t('profile.titleSignedIn') : t('profile.title')"
    :subtitle="customer.signedIn ? t('profile.subtitleSignedIn') : t('profile.subtitle')"
  />

  <section class="section">
    <div class="container">
      <p v-if="customer.loading" class="form-note">{{ t('common.loadingSaved') }}</p>
      <p v-if="error" class="form-note" role="alert">{{ error }}</p>

      <div v-if="!customer.loading && !customer.signedIn" class="account-auth">
        <div class="account-panel">
          <div class="admin-head">
            <h2><ShieldCheck/> {{ mode === 'login' ? t('profile.login') : t('profile.register') }}</h2>
            <button class="btn secondary" type="button" @click="mode = mode === 'login' ? 'register' : 'login'">
              {{ mode === 'login' ? t('profile.register') : t('profile.login') }}
            </button>
          </div>
          <form class="form-grid admin-form" @submit.prevent="submitAuth">
            <label v-if="mode === 'register'" class="span2">
              {{ t('profile.name') }}<input v-model="auth.name" autocomplete="name" required>
            </label>
            <label class="span2">
              {{ t('checkout.field.email') }}<input v-model="auth.email" type="email" autocomplete="email" required>
            </label>
            <label class="span2">
              {{ t('profile.password') }}
              <input v-model="auth.password" type="password" autocomplete="current-password" minlength="12" required>
            </label>
            <button class="btn primary span2" :disabled="busy">
              {{ busy ? t('checkout.wait') : mode === 'login' ? t('profile.login') : t('profile.register') }}
            </button>
          </form>
        </div>
        <div class="account-panel guest-panel">
          <h2>{{ t('profile.guestTitle') }}</h2>
          <p class="form-note">{{ t('profile.guestBlurb') }}</p>
          <div class="button-row">
            <AppLink class="btn primary" to="/track">{{ t('profile.guestTrack') }}</AppLink>
            <AppLink class="btn secondary" to="/shop"><Package :size="17"/> {{ t('profile.guestShop') }}</AppLink>
          </div>
        </div>
      </div>

      <div v-else-if="customer.signedIn" class="account-dashboard">
        <div class="admin-head account-panel">
          <span>
            <h2>{{ customer.customer?.name }}</h2>
            <small>{{ customer.customer?.email }}</small>
          </span>
          <button class="btn secondary" :disabled="busy" @click="logout"><LogOut :size="17"/> {{ t('profile.logout') }}</button>
        </div>

        <div class="account-grid">
          <div id="orders" class="account-panel">
            <h2><Package/> {{ t('profile.orders') }}</h2>
            <p v-if="!customer.orders.length" class="form-note">{{ t('profile.noOrders') }}</p>
            <div v-for="order in customer.orders" :key="order.publicNumber" class="order-row">
              <span>
                <b>{{ order.publicNumber }}</b>
                <small>{{ order.areaName }} · <bdi>{{ order.deliveryWindow }}</bdi></small>
                <small>{{ t(`tracking.fulfilment.${order.fulfilmentStatus}` as MessageKey) }} · {{ order.codStatus.replace(/_/g, ' ').toLowerCase() }}</small>
              </span>
              <strong>{{ money(order.totalFils / 1000) }}</strong>
              <AppLink class="btn secondary" :to="`/order/${order.trackingToken}`">{{ t('checkout.track') }}</AppLink>
              <button
                v-if="order.status === 'PENDING_CONFIRMATION'"
                class="btn secondary"
                :disabled="busy"
                @click="cancel(order.publicNumber)"
              >
                <X :size="15"/> {{ t('tracking.cancel') }}
              </button>
            </div>
          </div>

          <div class="account-panel">
            <h2><Heart/> {{ t('profile.wishlist') }}</h2>
            <p class="form-note">{{ t('profile.wishlistCount', {count: shop.wishlist.length}) }}</p>
            <AppLink class="btn primary" to="/wishlist">{{ t('nav.wishlist') }}</AppLink>
          </div>

          <div class="account-panel span2">
            <h2><Home/> {{ t('profile.addresses') }}</h2>
            <p v-if="!customer.addresses.length" class="form-note">{{ t('profile.noAddresses') }}</p>
            <div v-for="saved in customer.addresses" :key="saved.id" class="address-card">
              <b>{{ saved.label }}</b>
              <p>
                {{ saved.governorate }} · {{ saved.areaName }} · Block {{ saved.block }},
                {{ saved.street }}, {{ saved.building }}
              </p>
              <button class="btn secondary" :disabled="busy" @click="customer.deleteAddress(saved.id)">
                <Trash2 :size="15"/> {{ t('profile.deleteAddress') }}
              </button>
            </div>

            <form class="form-grid admin-form" @submit.prevent="addAddress">
              <label>{{ t('profile.addressLabel') }}<input v-model="address.label" required></label>
              <label>{{ t('checkout.field.governorate') }}<input v-model="address.governorate" required></label>
              <label>{{ t('checkout.field.area') }}<input v-model="address.areaName" required></label>
              <label>{{ t('checkout.field.block') }}<input v-model="address.block" required></label>
              <label>{{ t('checkout.field.street') }}<input v-model="address.street" required></label>
              <label>{{ t('checkout.field.building') }}<input v-model="address.building" required></label>
              <label>{{ t('checkout.field.floor') }}<input v-model="address.floorOrApartment"></label>
              <label class="span2">{{ t('checkout.field.instructions') }}<textarea v-model="address.deliveryInstructions"></textarea></label>
              <button class="btn primary span2" :disabled="busy"><Plus :size="16"/> {{ t('profile.addAddress') }}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
